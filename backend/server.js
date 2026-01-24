// backend/server.js
require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "1mb" }));

// ---- Postgres ----
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// Simple password hashing (beginner-friendly).
// Later we can upgrade to bcrypt.
function hashPassword(pw) {
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}

// ---- Helpers ----
function ok(res, data) {
  res.json(data);
}
function bad(res, msg, code = 400) {
  res.status(code).json({ error: msg });
}

// ---- Serve Frontend (single file) ----
const FRONTEND_INDEX = path.join(__dirname, "..", "frontend", "index.html");

app.get("/", (req, res) => {
  if (!fs.existsSync(FRONTEND_INDEX)) {
    return res
      .status(500)
      .send("frontend/index.html not found. Create it first.");
  }
  res.sendFile(FRONTEND_INDEX);
});

// ---- API: Health ----
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    ok(res, {
      ok: true,
      db: r.rows[0].ok === 1,
      port: process.env.PORT || 5001,
    });
  } catch (e) {
    bad(res, "DB connection failed: " + e.message, 500);
  }
});

// ---- Seed admin (if not exists) ----
async function ensureAdmin() {
  const email = "admin@workhub.local";
  const pass = "admin123";
  const name = "WorkHub Admin";

  const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
  if (existing.rows.length) return;

  await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash)
     VALUES ('admin', $1, $2, '', $3)`,
    [name, email, hashPassword(pass)]
  );
}

// ---- API: Register ----
app.post("/api/register", async (req, res) => {
  try {
    const { role, name, phone, email, password } = req.body || {};
    if (!["owner", "worker"].includes(role)) return bad(res, "Role must be owner or worker");
    if (!name || !email || !password) return bad(res, "Name, email and password are required");
    if (String(password).length < 4) return bad(res, "Password must be at least 4 characters");

    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return bad(res, "Email already exists");

    const userIns = await pool.query(
      `INSERT INTO users (role, name, email, phone, password_hash)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, role, name, email, phone`,
      [role, name, email, phone || "", hashPassword(password)]
    );

    const user = userIns.rows[0];

    // If worker, create profile row (default pending)
    if (role === "worker") {
      await pool.query(
        `INSERT INTO worker_profiles (user_id, skills, experience_years, location, status)
         VALUES ($1,'',0,'','pending')
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }

    ok(res, { user });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Login ----
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return bad(res, "Email and password required");

    const r = await pool.query(
      "SELECT id, role, name, email, phone, password_hash FROM users WHERE email=$1",
      [email]
    );
    if (!r.rows.length) return bad(res, "Invalid email/password", 401);

    const u = r.rows[0];
    if (u.password_hash !== hashPassword(password)) return bad(res, "Invalid email/password", 401);

    ok(res, {
      user: { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone || "" },
    });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Businesses list ----
app.get("/api/businesses", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.id, b.owner_id, b.name, b.category, b.location,
              u.name AS owner_name
       FROM businesses b
       JOIN users u ON u.id = b.owner_id
       ORDER BY b.id DESC`
    );
    ok(res, { items: r.rows });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Owner create business ----
app.post("/api/owner/businesses", async (req, res) => {
  try {
    const { owner_id, name, category, location } = req.body || {};
    if (!owner_id || !name) return bad(res, "owner_id and name required");

    const owner = await pool.query("SELECT id, role FROM users WHERE id=$1", [owner_id]);
    if (!owner.rows.length || owner.rows[0].role !== "owner") return bad(res, "Invalid owner_id");

    const r = await pool.query(
      `INSERT INTO businesses (owner_id, name, category, location)
       VALUES ($1,$2,$3,$4)
       RETURNING id, owner_id, name, category, location`,
      [owner_id, name, category || "", location || ""]
    );

    ok(res, { business: r.rows[0] });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Worker request to join business ----
app.post("/api/worker/register_business", async (req, res) => {
  try {
    const { worker_user_id, business_id } = req.body || {};
    if (!worker_user_id || !business_id) return bad(res, "worker_user_id and business_id required");

    const worker = await pool.query("SELECT id, role FROM users WHERE id=$1", [worker_user_id]);
    if (!worker.rows.length || worker.rows[0].role !== "worker") return bad(res, "Invalid worker_user_id");

    // Create request (unique constraint prevents duplicates)
    const r = await pool.query(
      `INSERT INTO business_worker_requests (business_id, worker_user_id, state)
       VALUES ($1,$2,'pending')
       ON CONFLICT (business_id, worker_user_id) DO UPDATE SET state='pending'
       RETURNING id, business_id, worker_user_id, state`,
      [business_id, worker_user_id]
    );

    ok(res, { request: r.rows[0] });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Owner pending requests ----
app.get("/api/owner/pending_requests", async (req, res) => {
  try {
    const owner_id = Number(req.query.owner_id || 0);
    if (!owner_id) return bad(res, "owner_id required");

    const r = await pool.query(
      `SELECT r.id AS request_id,
              r.business_id,
              b.name AS business_name,
              u.id AS worker_user_id,
              u.name AS worker_name,
              u.email,
              u.phone
       FROM business_worker_requests r
       JOIN businesses b ON b.id = r.business_id
       JOIN users u ON u.id = r.worker_user_id
       WHERE b.owner_id = $1 AND r.state = 'pending'
       ORDER BY r.id DESC`,
      [owner_id]
    );

    ok(res, { items: r.rows });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Owner approve request ----
app.post("/api/owner/approve_request", async (req, res) => {
  try {
    const { owner_id, request_id } = req.body || {};
    if (!owner_id || !request_id) return bad(res, "owner_id and request_id required");

    // verify owner owns the business for this request
    const check = await pool.query(
      `SELECT r.id, r.worker_user_id, r.business_id
       FROM business_worker_requests r
       JOIN businesses b ON b.id = r.business_id
       WHERE r.id = $1 AND b.owner_id = $2`,
      [request_id, owner_id]
    );
    if (!check.rows.length) return bad(res, "Request not found for this owner", 404);

    await pool.query(`UPDATE business_worker_requests SET state='approved' WHERE id=$1`, [request_id]);

    ok(res, { ok: true });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Worker profile update ----
app.post("/api/worker/profile", async (req, res) => {
  try {
    const { user_id, skills, experience_years, location } = req.body || {};
    if (!user_id) return bad(res, "user_id required");

    const worker = await pool.query("SELECT id, role FROM users WHERE id=$1", [user_id]);
    if (!worker.rows.length || worker.rows[0].role !== "worker") return bad(res, "Invalid user_id");

    await pool.query(
      `INSERT INTO worker_profiles (user_id, skills, experience_years, location, status)
       VALUES ($1,$2,$3,$4,'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         skills = EXCLUDED.skills,
         experience_years = EXCLUDED.experience_years,
         location = EXCLUDED.location`,
      [user_id, skills || "", Number(experience_years || 0), location || ""]
    );

    ok(res, { ok: true });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Worker status update ----
app.post("/api/worker/status", async (req, res) => {
  try {
    const { user_id, status } = req.body || {};
    if (!user_id || !status) return bad(res, "user_id and status required");
    if (!["pending", "ready", "busy"].includes(status)) return bad(res, "Invalid status");

    await pool.query(
      `UPDATE worker_profiles SET status=$2 WHERE user_id=$1`,
      [user_id, status]
    );

    ok(res, { ok: true });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- API: Workers list (approved only when filtering by business) ----
app.get("/api/workers", async (req, res) => {
  try {
    const status = (req.query.status || "").trim();
    const business_id = Number(req.query.business_id || 0);

    const where = [];
    const params = [];

    if (status) {
      params.push(status);
      where.push(`wp.status = $${params.length}`);
    }

    // if business_id filter is used, show only approved workers for that business
    let joinBiz = "";
    if (business_id) {
      params.push(business_id);
      joinBiz = `
        JOIN business_worker_requests r
          ON r.worker_user_id = u.id
         AND r.business_id = $${params.length}
         AND r.state = 'approved'
      `;
    }

    const q = `
      SELECT u.id AS user_id, u.name, u.email, u.phone,
             wp.skills, wp.experience_years, wp.location, wp.status,
             COALESCE(ROUND(AVG(rt.rating)::numeric, 1), 0) AS avg_rating,
             COUNT(rt.id) AS rating_count
      FROM users u
      JOIN worker_profiles wp ON wp.user_id = u.id
      ${joinBiz}
      LEFT JOIN ratings rt ON rt.worker_user_id = u.id
      WHERE u.role = 'worker'
      ${where.length ? "AND " + where.join(" AND ") : ""}
      GROUP BY u.id, wp.user_id
      ORDER BY u.id DESC
    `;

    const r = await pool.query(q, params);
    ok(res, { items: r.rows });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---- Start ----
(async () => {
  try {
    await pool.query("SELECT 1");
    await ensureAdmin();
    const port = Number(process.env.PORT || 5001);
    app.listen(port, () => {
      console.log(`WorkHub running on http://127.0.0.1:${port}`);
    });
  } catch (e) {
    console.error("Startup failed:", e.message);
    process.exit(1);
  }
})();
