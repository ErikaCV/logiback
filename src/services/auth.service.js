const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const DEFAULT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "logiflow-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "4h";

function getSaltRounds() {
  return Number.isFinite(DEFAULT_SALT_ROUNDS) && DEFAULT_SALT_ROUNDS > 0
    ? DEFAULT_SALT_ROUNDS
    : 10;
}

async function hashPassword(password) {
  if (typeof password !== "string" || password.trim().length < 1) {
    throw new Error("Password requerido para generar hash");
  }
  return bcrypt.hash(password, getSaltRounds());
}

async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

function buildJwtPayload(user) {
  if (!user || typeof user !== "object") {
    throw new Error("Usuario requerido para firmar JWT");
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role || "operador",
  };
}

function generateJwtForUser(user, options = {}) {
  const payload = buildJwtPayload(user);
  const signOptions = { expiresIn: JWT_EXPIRES_IN, ...options };
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

function verifyJwtToken(token) {
  if (!token) {
    throw new Error("Token requerido");
  }
  return jwt.verify(token, JWT_SECRET);
}

function sanitizeUser(user) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe._id;
  return safe;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateJwtForUser,
  verifyJwtToken,
  sanitizeUser,
};
