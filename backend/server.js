const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 5000;

app.use(express.json());

const dbPath = path.join(__dirname, "database", "workhub.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});



// test route
app.get("/", (req, res) => {
  res.send("WorkHub backend is running");
});

// GET all businesses
app.get("/api/businesses", (req, res) => {
  const sql = "SELECT id, name, city FROM businesses";

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
