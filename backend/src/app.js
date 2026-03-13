const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const sessionRoutes = require("./routes/sessionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { requireAuth } = require("./middleware/authMiddleware");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "trust-meter-backend" });
});

app.use("/api", authRoutes);
app.use("/api", requireAuth, aiRoutes);
app.use("/api", requireAuth, sessionRoutes);
app.use("/api", requireAuth, adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ message: "Internal server error", details: err.message });
});

module.exports = app;
