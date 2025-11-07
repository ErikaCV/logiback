const {
  getCollection,
  getNextSequence,
  unwrapFindAndModifyResult,
} = require("../db/mongo");

function collection() {
  return getCollection("users");
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function findById(id) {
  if (!Number.isFinite(Number(id))) return null;
  return collection().findOne({ id: Number(id) });
}

async function findByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return collection().findOne({ email: normalized });
}

async function isEmailTaken(email, excludeId = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const filter = { email: normalized };
  if (excludeId != null) {
    filter.id = { $ne: excludeId };
  }
  const existing = await collection().findOne(filter, { projection: { id: 1 } });
  return Boolean(existing);
}

async function create({ email, name, passwordHash, role = "operador" }) {
  const now = new Date().toISOString();
  const doc = {
    id: await getNextSequence("users"),
    email: normalizeEmail(email),
    name: name ? name.trim() : "",
    role,
    status: "active",
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  await collection().insertOne(doc);
  return doc;
}

async function updateLastLogin(id) {
  const when = new Date().toISOString();
  const result = await collection().findOneAndUpdate(
    { id: Number(id) },
    { $set: { lastLoginAt: when, updatedAt: when } },
    { returnDocument: "after", projection: { id: 1, email: 1, name: 1, role: 1, status: 1, createdAt: 1, updatedAt: 1, lastLoginAt: 1 } }
  );
  return unwrapFindAndModifyResult(result);
}

module.exports = {
  collection,
  findById,
  findByEmail,
  isEmailTaken,
  create,
  updateLastLogin,
  normalizeEmail,
};
