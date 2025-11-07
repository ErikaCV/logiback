const Users = require("../models/users.model");
const { verifyJwtToken, sanitizeUser } = require("../services/auth.service");

function attachCurrentUser(req, res, next) {
  res.locals.currentUser = req.user || null;
  next();
}

function ensureSessionAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  const nextParam = encodeURIComponent(req.originalUrl || "/views");
  return res.redirect(`/auth/login?next=${nextParam}`);
}

function extractBearerToken(req) {
  const header = req.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  if (req.query && typeof req.query.token === "string") {
    return req.query.token;
  }
  return null;
}

async function requireJwtAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "UNAUTHORIZED" });
    }
    const payload = verifyJwtToken(token);
    const user = await Users.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: "UNAUTHORIZED" });
    }
    req.authUser = sanitizeUser(user);
    return next();
  } catch (err) {
    return res.status(401).json({ message: "INVALID_TOKEN" });
  }
}

module.exports = {
  attachCurrentUser,
  ensureSessionAuth,
  requireJwtAuth,
};
