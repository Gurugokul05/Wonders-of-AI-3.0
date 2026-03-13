const { verifyToken } = require("../services/authService");

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header" });
    }

    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized", details: error.message });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
