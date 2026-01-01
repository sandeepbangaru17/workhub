const express = require("express");

const app = express();
const PORT = 5000;

// test route
app.get("/", (req, res) => {
  res.send("WorkHub backend is running");
});

// start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
