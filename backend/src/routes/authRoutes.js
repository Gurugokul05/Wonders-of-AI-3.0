const express = require("express");
const {
  authenticateWithDemoUser,
  signToken,
} = require("../services/authService");

const router = express.Router();

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = authenticateWithDemoUser(email, password);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  });
});

module.exports = router;
