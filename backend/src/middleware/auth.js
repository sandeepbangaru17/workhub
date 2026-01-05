const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "workhub_secret_key";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const parts = header.split(" ");
  const type = parts[0];
  const token = parts[1];

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth, JWT_SECRET };
