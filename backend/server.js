const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT || 5001);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/* =========================
   DB Schema
   ========================= */
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','owner','worker')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      location TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS worker_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      skills TEXT DEFAULT '',
      experience TEXT DEFAULT '',
      location TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','busy')),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS worker_requests (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(worker_id, business_id)
    );
  `);
}

/* =========================
   Cookie Session (Signed)
   ========================= */
function signSession(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySession(token) {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (expected !== sig) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function setSessionCookie(res, sessionObj) {
  const token = signSession(sessionObj);
  res.cookie("wh_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

function clearSessionCookie(res) {
  res.clearCookie("wh_session");
}

async function getUserFromSession(req) {
  const token = req.cookies?.wh_session;
  const sess = verifySession(token);
  if (!sess?.uid) return null;

  const { rows } = await pool.query(
    "SELECT id, name, email, role FROM users WHERE id=$1",
    [sess.uid]
  );
  return rows[0] || null;
}

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const user = await getUserFromSession(req);
      if (!user) return res.status(401).json({ error: "Not logged in" });
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.user = user;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
}

/* =========================
   Seed default admin
   ========================= */
async function ensureAdminSeed() {
  const adminEmail = "admin@workhub.local";
  const adminPass = "admin123";
  const { rows } = await pool.query("SELECT id FROM users WHERE email=$1", [adminEmail]);
  if (rows.length) return;

  const hash = await bcrypt.hash(adminPass, 10);
  await pool.query(
    "INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin')",
    ["WorkHub Admin", adminEmail, hash]
  );
  console.log("✅ Seeded admin:", adminEmail, "password:", adminPass);
}

/* =========================
   API
   ========================= */
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "DB not reachable" });
  }
});

app.get("/api/me", requireRole("admin", "owner", "worker"), async (req, res) => {
  const user = req.user;
  let worker = null;

  if (user.role === "worker") {
    const { rows } = await pool.query(
      "SELECT skills, experience, location, status FROM worker_profiles WHERE user_id=$1",
      [user.id]
    );
    worker = rows[0] || { skills: "", experience: "", location: "", status: "pending" };
  }

  res.json({ ...user, worker });
});

app.post("/api/logout", async (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/register", async (req, res) => {
  const { name, role, email, password } = req.body || {};
  if (!name || name.length < 2) return res.status(400).json({ error: "Name required" });
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email required" });
  if (!password || password.length < 4) return res.status(400).json({ error: "Password too short" });
  if (!["worker", "owner"].includes(role)) return res.status(400).json({ error: "Invalid role" });

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      "INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id",
      [name, email.toLowerCase(), hash, role]
    );

    if (role === "worker") {
      await pool.query(
        "INSERT INTO worker_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [rows[0].id]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    if (String(e.message).includes("duplicate key")) return res.status(409).json({ error: "Email already exists" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email & password required" });

  const { rows } = await pool.query(
    "SELECT id,name,email,role,password_hash FROM users WHERE email=$1",
    [email.toLowerCase()]
  );

  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  setSessionCookie(res, { uid: user.id });
  res.json({ ok: true, role: user.role, name: user.name });
});

/* Browse */
app.get("/api/businesses", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.name, b.category, b.location
     FROM businesses b
     ORDER BY b.created_at DESC`
  );
  res.json(rows);
});

app.get("/api/workers", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      u.id AS worker_id,
      u.name,
      u.email,
      wp.skills,
      wp.experience,
      wp.location,
      wp.status,
      wr.business_id
    FROM users u
    LEFT JOIN worker_profiles wp ON wp.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT business_id
      FROM worker_requests
      WHERE worker_id = u.id AND status='approved'
      ORDER BY created_at DESC
      LIMIT 1
    ) wr ON TRUE
    WHERE u.role='worker'
    ORDER BY u.id DESC
  `);

  res.json(rows.map(r => ({
    id: r.worker_id,
    name: r.name,
    email: r.email,
    skills: r.skills || "",
    experience: r.experience || "",
    location: r.location || "",
    status: r.status || "pending",
    business_id: r.business_id
  })));
});

/* Worker */
app.post("/api/worker/profile", requireRole("worker"), async (req, res) => {
  const { skills = "", experience = "", location = "", status = "pending" } = req.body || {};
  if (!["pending", "ready", "busy"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  await pool.query(
    `INSERT INTO worker_profiles (user_id, skills, experience, location, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET skills=$2, experience=$3, location=$4, status=$5, updated_at=NOW()`,
    [req.user.id, skills, experience, location, status]
  );

  res.json({ ok: true });
});

app.post("/api/worker/join", requireRole("worker"), async (req, res) => {
  const { business_id } = req.body || {};
  if (!business_id) return res.status(400).json({ error: "business_id required" });

  try {
    await pool.query(
      "INSERT INTO worker_requests (worker_id, business_id, status) VALUES ($1,$2,'pending')",
      [req.user.id, Number(business_id)]
    );
    res.json({ ok: true });
  } catch (e) {
    if (String(e.message).includes("duplicate key")) return res.status(409).json({ error: "Already requested" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* Owner */
app.post("/api/owner/businesses", requireRole("owner"), async (req, res) => {
  const { name, category = "", location = "" } = req.body || {};
  if (!name || name.length < 2) return res.status(400).json({ error: "Business name required" });

  await pool.query(
    "INSERT INTO businesses (owner_id, name, category, location) VALUES ($1,$2,$3,$4)",
    [req.user.id, name, category, location]
  );

  res.json({ ok: true });
});

app.get("/api/owner/requests", requireRole("owner"), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      wr.id AS request_id,
      wr.business_id,
      b.name AS business_name,
      u.id AS worker_id,
      u.name AS worker_name,
      wp.skills
    FROM worker_requests wr
    JOIN businesses b ON b.id = wr.business_id
    JOIN users u ON u.id = wr.worker_id
    LEFT JOIN worker_profiles wp ON wp.user_id = u.id
    WHERE b.owner_id = $1 AND wr.status='pending'
    ORDER BY wr.created_at DESC
  `, [req.user.id]);

  res.json(rows);
});

app.post("/api/owner/requests/:id/decision", requireRole("owner"), async (req, res) => {
  const requestId = Number(req.params.id);
  const { approve } = req.body || {};
  const newStatus = approve ? "approved" : "rejected";

  const { rows } = await pool.query(`
    SELECT wr.id
    FROM worker_requests wr
    JOIN businesses b ON b.id = wr.business_id
    WHERE wr.id=$1 AND b.owner_id=$2
  `, [requestId, req.user.id]);

  if (!rows.length) return res.status(404).json({ error: "Request not found" });

  await pool.query("UPDATE worker_requests SET status=$1 WHERE id=$2", [newStatus, requestId]);
  res.json({ ok: true });
});

app.get("/api/owner/workers", requireRole("owner"), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      u.id AS worker_id,
      u.name,
      u.email,
      wp.skills,
      wp.location,
      wp.status,
      b.name AS business_name
    FROM worker_requests wr
    JOIN businesses b ON b.id = wr.business_id
    JOIN users u ON u.id = wr.worker_id
    LEFT JOIN worker_profiles wp ON wp.user_id = u.id
    WHERE b.owner_id=$1 AND wr.status='approved'
    ORDER BY u.id DESC
  `, [req.user.id]);

  res.json(rows);
});

/* Admin */
app.get("/api/admin/businesses", requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      b.id,
      b.name,
      b.category,
      b.location,
      u.name AS owner_name
    FROM businesses b
    JOIN users u ON u.id = b.owner_id
    ORDER BY b.created_at DESC
  `);
  res.json(rows);
});

/* =========================
   Serve frontend
   ========================= */
const FRONTEND_FILE = path.join(__dirname, "..", "frontend", "index.html");

app.get("/", (req, res) => {
  if (!fs.existsSync(FRONTEND_FILE)) return res.status(404).send("frontend/index.html not found");
  res.sendFile(FRONTEND_FILE);
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  if (!fs.existsSync(FRONTEND_FILE)) return res.status(404).send("frontend/index.html not found");
  res.sendFile(FRONTEND_FILE);
});

/* =========================
   Boot
   ========================= */
(async function boot() {
  try {
    await ensureSchema();
    await ensureAdminSeed();
    app.listen(PORT, () => console.log(`✅ WorkHub running at http://127.0.0.1:${PORT}`));
  } catch (e) {
    console.error("❌ Failed to start:", e.message);
    process.exit(1);
  }
})();
