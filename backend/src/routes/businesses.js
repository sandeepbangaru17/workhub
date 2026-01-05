const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET all businesses
// GET /api/businesses
router.get("/", (req, res) => {
  db.all("SELECT id, name, city, owner_id FROM businesses", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// ✅ GET workers by business id
// GET /api/businesses/:id/workers
router.get("/:id/workers", (req, res) => {
  const businessId = req.params.id;
  const { status } = req.query;

  let sql = `
    SELECT
      w.id,
      w.business_id,
      u.name AS worker_name,
      u.phone AS worker_phone,
      w.experience,
      w.skills,
      w.status
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

// POST create business
// POST /api/businesses
router.post("/", requireAuth, (req, res) => {
  const { name, city } = req.body;
  if (!name || !city) return res.status(400).json({ error: "name and city are required" });

  if (!["admin", "owner"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.run(
    "INSERT INTO businesses (name, city, owner_id) VALUES (?, ?, ?)",
    [name, city, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.status(201).json({ business_id: this.lastID });
    }
  );
});

module.exports = router;
