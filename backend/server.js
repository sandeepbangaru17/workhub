const express = require("express");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 5001);

// Postgres pool
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

// ---------- DB init ----------
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL CHECK(role IN ('admin','owner','worker')),
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS worker_profiles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        skills TEXT DEFAULT '',
        experience_years INT DEFAULT 0,
        location TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','busy')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_workers (
        id SERIAL PRIMARY KEY,
        business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        worker_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(business_id, worker_user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        worker_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stars INT NOT NULL CHECK(stars BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed admin if missing
    const admin = await client.query(`SELECT id FROM users WHERE role='admin' LIMIT 1;`);
    if (admin.rowCount === 0) {
      await client.query(
        `INSERT INTO users(role,name,email,password) VALUES($1,$2,$3,$4);`,
        ["admin", "Admin", "admin@workhub.local", "admin123"]
      );
    }
  } finally {
    client.release();
  }
}

// ---------- API ----------
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 as ok;");
    res.json({ ok: true, db: true, port: PORT, sample: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: e.message });
  }
});

app.post("/api/register", async (req, res) => {
  const { role, name, phone, email, password } = req.body || {};
  const r = String(role || "").toLowerCase().trim();
  const n = String(name || "").trim();
  const e = String(email || "").toLowerCase().trim();
  const p = String(password || "");

  if (!["owner", "worker"].includes(r)) return res.status(400).json({ ok: false, error: "Role must be owner or worker" });
  if (!n || !e || p.length < 4) return res.status(400).json({ ok: false, error: "Name, email and password (min 4 chars) required" });

  try {
    const out = await pool.query(
      `INSERT INTO users(role,name,phone,email,password)
       VALUES($1,$2,$3,$4,$5) RETURNING id,role,name,email;`,
      [r, n, phone || "", e, p]
    );

    if (r === "worker") {
      await pool.query(`INSERT INTO worker_profiles(user_id) VALUES($1);`, [out.rows[0].id]);
    }

    res.json({ ok: true, user: out.rows[0] });
  } catch (err) {
    if (String(err.message).includes("duplicate key")) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const e = String(email || "").toLowerCase().trim();
  const p = String(password || "");

  const out = await pool.query(`SELECT id,role,name,email,password FROM users WHERE email=$1;`, [e]);
  if (out.rowCount === 0 || out.rows[0].password !== p) {
    return res.status(401).json({ ok: false, error: "Invalid email/password" });
  }

  const u = out.rows[0];
  res.json({ ok: true, user: { id: u.id, role: u.role, name: u.name, email: u.email } });
});

// Owner: create business
app.post("/api/owner/businesses", async (req, res) => {
  const { owner_id, name, category, location } = req.body || {};
  if (!owner_id || !String(name || "").trim()) return res.status(400).json({ ok: false, error: "owner_id and business name required" });

  const own = await pool.query(`SELECT id FROM users WHERE id=$1 AND role='owner';`, [owner_id]);
  if (own.rowCount === 0) return res.status(403).json({ ok: false, error: "Invalid owner_id" });

  const out = await pool.query(
    `INSERT INTO businesses(owner_id,name,category,location)
     VALUES($1,$2,$3,$4) RETURNING *;`,
    [owner_id, String(name).trim(), String(category || "").trim(), String(location || "").trim()]
  );

  res.json({ ok: true, business: out.rows[0] });
});

// Public: list businesses
app.get("/api/businesses", async (req, res) => {
  const out = await pool.query(`
    SELECT b.*, u.name AS owner_name
    FROM businesses b
    JOIN users u ON u.id=b.owner_id
    ORDER BY b.id DESC;
  `);
  res.json({ ok: true, items: out.rows });
});

// Worker: update profile
app.post("/api/worker/profile", async (req, res) => {
  const { user_id, skills, experience_years, location } = req.body || {};
  if (!user_id) return res.status(400).json({ ok: false, error: "user_id required" });

  const w = await pool.query(`SELECT id FROM users WHERE id=$1 AND role='worker';`, [user_id]);
  if (w.rowCount === 0) return res.status(403).json({ ok: false, error: "Invalid worker user_id" });

  const out = await pool.query(
    `UPDATE worker_profiles
     SET skills=$1, experience_years=$2, location=$3
     WHERE user_id=$4
     RETURNING *;`,
    [String(skills || "").trim(), Number(experience_years || 0), String(location || "").trim(), user_id]
  );

  res.json({ ok: true, profile: out.rows[0] });
});

// Worker: set status
app.post("/api/worker/status", async (req, res) => {
  const { user_id, status } = req.body || {};
  const s = String(status || "").toLowerCase().trim();
  if (!["pending", "ready", "busy"].includes(s)) return res.status(400).json({ ok: false, error: "status must be pending/ready/busy" });

  const out = await pool.query(
    `UPDATE worker_profiles SET status=$1 WHERE user_id=$2 RETURNING user_id,status;`,
    [s, user_id]
  );
  if (out.rowCount === 0) return res.status(404).json({ ok: false, error: "worker not found" });

  res.json({ ok: true, worker: out.rows[0] });
});

// Worker: request to join business
app.post("/api/worker/register_business", async (req, res) => {
  const { worker_user_id, business_id } = req.body || {};
  if (!worker_user_id || !business_id) return res.status(400).json({ ok: false, error: "worker_user_id and business_id required" });

  try {
    const out = await pool.query(
      `INSERT INTO business_workers(business_id, worker_user_id, approved)
       VALUES($1,$2,FALSE) RETURNING *;`,
      [business_id, worker_user_id]
    );
    res.json({ ok: true, request: out.rows[0] });
  } catch (err) {
    if (String(err.message).includes("duplicate key")) {
      return res.status(409).json({ ok: false, error: "Already requested/registered" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Owner: pending requests
app.get("/api/owner/pending_requests", async (req, res) => {
  const owner_id = req.query.owner_id;
  if (!owner_id) return res.status(400).json({ ok: false, error: "owner_id required" });

  const out = await pool.query(`
    SELECT bw.id as request_id, bw.business_id, b.name as business_name,
           bw.worker_user_id, u.name as worker_name, u.phone, u.email,
           bw.approved, bw.created_at
    FROM business_workers bw
    JOIN businesses b ON b.id=bw.business_id
    JOIN users u ON u.id=bw.worker_user_id
    WHERE b.owner_id=$1 AND bw.approved=FALSE
    ORDER BY bw.created_at DESC;
  `, [owner_id]);

  res.json({ ok: true, items: out.rows });
});

// Owner: approve request
app.post("/api/owner/approve_request", async (req, res) => {
  const { owner_id, request_id } = req.body || {};
  if (!owner_id || !request_id) return res.status(400).json({ ok: false, error: "owner_id and request_id required" });

  const chk = await pool.query(`
    SELECT bw.id
    FROM business_workers bw
    JOIN businesses b ON b.id=bw.business_id
    WHERE bw.id=$1 AND b.owner_id=$2;
  `, [request_id, owner_id]);

  if (chk.rowCount === 0) return res.status(403).json({ ok: false, error: "Not allowed" });

  const out = await pool.query(
    `UPDATE business_workers SET approved=TRUE WHERE id=$1 RETURNING id, approved;`,
    [request_id]
  );

  res.json({ ok: true, updated: out.rows[0] });
});

// Public: list workers (optional filters)
app.get("/api/workers", async (req, res) => {
  const status = String(req.query.status || "").toLowerCase().trim();
  const business_id = req.query.business_id;

  const params = [];
  const where = [`u.role='worker'`];

  if (["pending","ready","busy"].includes(status)) {
    params.push(status);
    where.push(`wp.status=$${params.length}`);
  }

  let joinBw = "";
  if (business_id) {
    params.unshift(business_id); // business_id is $1 now
    joinBw = `
      JOIN business_workers bw
        ON bw.worker_user_id=u.id
       AND bw.business_id=$1
       AND bw.approved=TRUE
    `;
  }

  // If business_id was added, shift the rest placeholders by 1 in where
  // easiest: rebuild query with correct placeholders
  const statusClause = ["pending","ready","busy"].includes(status)
    ? (business_id ? `AND wp.status=$2` : `AND wp.status=$1`)
    : "";

  const q = `
    SELECT u.id as user_id, u.name, u.phone, u.email,
           wp.skills, wp.experience_years, wp.location, wp.status,
           COALESCE(ROUND(AVG(r.stars)::numeric, 1), 0) as avg_rating,
           COUNT(r.id) as rating_count
    FROM users u
    JOIN worker_profiles wp ON wp.user_id=u.id
    LEFT JOIN ratings r ON r.worker_user_id=u.id
    ${joinBw}
    WHERE u.role='worker' ${statusClause}
    GROUP BY u.id, wp.id
    ORDER BY avg_rating DESC, u.id DESC;
  `;

  const out = await pool.query(q, params);
  res.json({ ok: true, items: out.rows });
});

// ---------- Serve frontend ----------
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
app.use("/frontend", express.static(FRONTEND_DIR));

// ---------- Start ----------
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ WorkHub running: http://127.0.0.1:${PORT}`);
      console.log(`   UI: http://127.0.0.1:${PORT}/`);
      console.log(`   Health: http://127.0.0.1:${PORT}/api/health`);
    });
  })
  .catch((e) => {
    console.error("❌ DB init failed:", e.message);
    process.exit(1);
  });
