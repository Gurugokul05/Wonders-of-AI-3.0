const jwt = require("jsonwebtoken");

const TOKEN_TTL = "8h";
const DEV_JWT_FALLBACK = "trust-meter-dev-secret";

function getDemoUsers() {
  return [
    {
      id: "admin-demo",
      email: process.env.DEMO_ADMIN_EMAIL || "admin@trustmeter.ai",
      password: process.env.DEMO_ADMIN_PASSWORD || "Admin@123",
      role: "admin",
      name: "Hackathon Admin",
    },
    {
      id: "candidate-demo",
      email: process.env.DEMO_CANDIDATE_EMAIL || "candidate@trustmeter.ai",
      password: process.env.DEMO_CANDIDATE_PASSWORD || "Candidate@123",
      role: "candidate",
      name: "Demo Candidate",
    },
  ];
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || DEV_JWT_FALLBACK;

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    { expiresIn: TOKEN_TTL },
  );
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || DEV_JWT_FALLBACK;
  return jwt.verify(token, secret);
}

function authenticateWithDemoUser(email, password) {
  const users = getDemoUsers();
  return (
    users.find((u) => u.email === email && u.password === password) || null
  );
}

module.exports = {
  authenticateWithDemoUser,
  signToken,
  verifyToken,
};
