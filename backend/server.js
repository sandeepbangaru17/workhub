const express = require("express");
const sqlite3 = require("sqlite3").verbose();


const app = express();
const PORT = 5000;


app.use(express.json());
const db = new sqlite3.Database("./database/workhub.db", (err) => {
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

// start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
