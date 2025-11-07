#!/usr/bin/env node
"use strict";

require("dotenv").config();

const { connect, getCollection, disconnect } = require("../src/db/mongo");
const Users = require("../src/models/users.model");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { email: null, all: false };
  args.forEach((arg) => {
    if (arg === "--all") options.all = true;
    if (arg.startsWith("--email=")) {
      options.email = arg.slice("--email=".length).trim();
    }
  });
  return options;
}

function usage() {
  console.log("Usage:");
  console.log("  node scripts/update-user-roles.js --all");
  console.log("  node scripts/update-user-roles.js --email=usuario@dominio.com");
}

async function main() {
  const { email, all } = parseArgs();
  if (!all && !email) {
    usage();
    process.exit(1);
  }

  await connect();
  const collection = getCollection("users");

  const filter = all
    ? { role: "operator" }
    : { email: Users.normalizeEmail(email) };

  const result = await collection.updateMany(filter, { $set: { role: "operador" } });

  console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
