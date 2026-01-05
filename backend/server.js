const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

app.use(cors());
app.use(express.json());

// DB
const dbPath = path.join(__dirname, "database", "workhub.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("DB error:", err.message);
  else console.log("Connected to SQLite:", dbPath);
});

// Create tables + seed
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('worker','owner','admin'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      experience INTEGER DEFAULT 0,
      skills TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','busy')),
      UNIQUE(business_id, user_id),
      FOREIGN KEY(business_id) REFERENCES businesses(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // seed owner + business if empty
  db.get("SELECT COUNT(*) as c FROM users", async (err, row) => {
    if (err) return;
    if (row.c === 0) {
      const hash = await bcrypt.hash("owner123", 10);
      db.run(
        "INSERT INTO users (name, phone, password, role) VALUES (?,?,?,?)",
        ["Demo Owner", "8888888888", hash, "owner"],
        function () {
          const ownerId = this.lastID;
          db.run(
            "INSERT INTO businesses (name, city, owner_id) VALUES (?,?,?)",
            ["Sri Sai Restaurant", "Visakhapatnam", ownerId]
          );
          console.log("Seeded demo owner (8888888888 / owner123) + business");
        }
      );
    }
  });
});

// Auth middleware
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Health
app.get("/", (req, res) => res.send("WorkHub backend running ✅"));

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, phone, password, role } = req.body;
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "name, phone, password, role required" });
  }
  if (!["worker", "owner"].includes(role)) {
    return res.status(400).json({ error: "role must be worker or owner" });
  }

  const hash = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (name, phone, password, role) VALUES (?,?,?,?)",
    [name, phone, hash, role],
    function (err) {
      if (err) {
        if (String(err.message).includes("UNIQUE")) {
          return res.status(409).json({ error: "Phone already registered" });
        }
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(201).json({ message: "User registered", user_id: this.lastID, role });
    }
  );
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: "phone and password required" });

  db.get("SELECT * FROM users WHERE phone = ?", [phone], async (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const payload = { id: user.id, role: user.role, name: user.name, phone: user.phone };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token, user: payload });
  });
});

// Businesses (public)
app.get("/api/businesses", (req, res) => {
  db.all("SELECT id, name, city, owner_id FROM businesses", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// Workers by business (public)
app.get("/api/businesses/:id/workers", (req, res) => {
  const businessId = req.params.id;
  const status = req.query.status;

  let sql = `
    SELECT w.id, w.business_id,
           u.name AS worker_name, u.phone AS worker_phone,
           w.experience, w.skills, w.status
    FROM workers w
    JOIN users u ON w.user_id = u.id
    WHERE w.business_id = ?
  `;
  const params = [businessId];
  if (status) {
    sql += " AND w.status = ?";
    params.push(status);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// Worker apply (worker only)
app.post("/api/workers/apply", requireAuth, (req, res) => {
  if (req.user.role !== "worker") return res.status(403).json({ error: "Only workers can apply" });

  const { business_id, experience = 0, skills = "" } = req.body;
  if (!business_id) return res.status(400).json({ error: "business_id is required" });

  db.run(
    `INSERT INTO workers (business_id, user_id, experience, skills, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [business_id, req.user.id, experience, skills],
    function (err) {
      if (err) {
        if (String(err.message).includes("UNIQUE")) {
          return res.status(409).json({ error: "Already applied to this business" });
        }
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ message: "Applied successfully", worker_id: this.lastID });
    }
  );
});

// Owner approve (owner/admin only)
app.post("/api/workers/:workerId/approve", requireAuth, (req, res) => {
  if (!["owner", "admin"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });

  const workerId = req.params.workerId;

  const checkSql = `
    SELECT w.id, b.owner_id
    FROM workers w
    JOIN businesses b ON w.business_id = b.id
    WHERE w.id = ?
  `;

  db.get(checkSql, [workerId], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Worker not found" });

    if (req.user.role === "owner" && row.owner_id !== req.user.id) {
      return res.status(403).json({ error: "Not your business" });
    }

    db.run("UPDATE workers SET status='ready' WHERE id=?", [workerId], (err2) => {
      if (err2) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Worker approved", worker_id: workerId, status: "ready" });
    });
  });
});

app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
