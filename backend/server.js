const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth");
const businessRoutes = require("./src/routes/businesses");
const workerRoutes = require("./src/routes/workers");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("WorkHub backend is running ✅");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/workers", workerRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
