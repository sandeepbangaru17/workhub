const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "name, phone, password are required" });
    }

    const finalRole = role && ["worker", "owner", "admin"].includes(role) ? role : "worker";
    const passwordHash = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)";
    db.run(sql, [name, phone, passwordHash, finalRole], function (err) {
      if (err) {
        if (String(err.message).includes("UNIQUE")) return res.status(409).json({ error: "Phone already exists" });
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(201).json({ message: "User registered", user_id: this.lastID, role: finalRole });
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: "phone and password required" });

  const sql = "SELECT id, name, phone, password, role FROM users WHERE phone = ?";
  db.get(sql, [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: row.id, role: row.role, name: row.name, phone: row.phone },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: row.id, name: row.name, phone: row.phone, role: row.role },
    });
  });
});

module.exports = router;
