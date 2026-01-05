const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Worker applies to a business (status = pending)
 * POST /api/workers/apply
 * body: { business_id, experience, skills }
 * auth: worker only
 */
router.post("/apply", requireAuth, (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Only workers can apply" });
  }

  const { business_id, experience = 0, skills = "" } = req.body;
  if (!business_id) return res.status(400).json({ error: "business_id is required" });

  // prevent duplicate application for same business
  db.get(
    "SELECT id FROM workers WHERE business_id = ? AND user_id = ?",
    [business_id, req.user.id],
    (err, existing) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (existing) return res.status(409).json({ error: "Already applied to this business" });

      db.run(
        `INSERT INTO workers (business_id, user_id, role, experience, skills, status)
         VALUES (?, ?, 'worker', ?, ?, 'pending')`,
        [business_id, req.user.id, experience, skills],
        function (err2) {
          if (err2) return res.status(500).json({ error: "Database error" });
          return res.status(201).json({ message: "Applied successfully", worker_id: this.lastID });
        }
      );
    }
  );
});

/**
 * Get workers by business (public)
 * GET /api/workers/business/:id/workers?status=ready|busy|pending
 */
router.get("/business/:id/workers", (req, res) => {
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
    return res.json(rows);
  });
});

/**
 * Approve a worker (owner/admin)
 * POST /api/workers/:workerId/approve
 */
router.post("/:workerId/approve", requireAuth, (req, res) => {
  const workerId = req.params.workerId;

  if (req.user.role !== "admin" && req.user.role !== "owner") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // owner can approve only workers under their business
  const checkSql = `
    SELECT w.id, b.owner_id
    FROM workers w
    JOIN businesses b ON w.business_id = b.id
    WHERE w.id = ?
  `;

  db.get(checkSql, [workerId], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Worker record not found" });

    if (req.user.role === "owner" && row.owner_id !== req.user.id) {
      return res.status(403).json({ error: "Not your business" });
    }

    db.run("UPDATE workers SET status = 'ready' WHERE id = ?", [workerId], function (err2) {
      if (err2) return res.status(500).json({ error: "Database error" });
      return res.json({ message: "Worker approved", worker_id: workerId, status: "ready" });
    });
  });
});

/**
 * Update worker status (owner/admin)
 * PATCH /api/workers/:workerId/status
 * body: { status: 'ready'|'busy'|'pending' }
 */
router.patch("/:workerId/status", requireAuth, (req, res) => {
  const workerId = req.params.workerId;
  const { status } = req.body;

  if (!["pending", "ready", "busy"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (req.user.role !== "admin" && req.user.role !== "owner") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const checkSql = `
    SELECT w.id, b.owner_id
    FROM workers w
    JOIN businesses b ON w.business_id = b.id
    WHERE w.id = ?
  `;

  db.get(checkSql, [workerId], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Worker record not found" });

    if (req.user.role === "owner" && row.owner_id !== req.user.id) {
      return res.status(403).json({ error: "Not your business" });
    }

    db.run("UPDATE workers SET status = ? WHERE id = ?", [status, workerId], function (err2) {
      if (err2) return res.status(500).json({ error: "Database error" });
      return res.json({ message: "Status updated", worker_id: workerId, status });
    });
  });
});

module.exports = router;
