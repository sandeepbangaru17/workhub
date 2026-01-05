const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("WorkHub backend running ✅");
});

app.get("/api/businesses", (req, res) => {
  res.json([
    { id: 1, name: "Sri Sai Restaurant", city: "Visakhapatnam" },
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
