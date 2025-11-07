require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./config/passport");
const { connect, getClient } = require("./db/mongo");
const {
  attachCurrentUser,
  ensureSessionAuth,
  requireJwtAuth,
} = require("./middleware/auth");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// --- DB lazy init (una sola vez por proceso) ---
let dbInitPromise = null;
function ensureDb() {
  if (!dbInitPromise) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;
    dbInitPromise = connect({ uri, dbName });
  }
  return dbInitPromise;
}
// Conectamos antes de procesar cualquier request
app.use((req, res, next) => {
  ensureDb().then(() => next()).catch(next);
});

const mongoDbName = process.env.MONGODB_DB || "logiflow";
const sessionSecret = process.env.SESSION_SECRET || "logiflow-dev-secret";
const isProduction = process.env.NODE_ENV === "production";
const sessionStore = MongoStore.create({
  clientPromise: ensureDb().then(() => getClient()),
  dbName: mongoDbName,
  collectionName: "sessions",
});

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(attachCurrentUser);

app.get("/", (req, res) => {
  return res.status(200).json({ ok: true, name: "logiflow-mvp" });
});

app.use("/auth", require("./modules/auth.routes"));

app.use("/views", ensureSessionAuth, require("./modules/views.routes"));

app.use("/customers", requireJwtAuth, require("./modules/customers.routes"));
app.use("/products", requireJwtAuth, require("./modules/products.routes"));
app.use("/warehouses", requireJwtAuth, require("./modules/warehouses.routes"));
app.use("/stock", requireJwtAuth, require("./modules/stock.routes"));
app.use("/orders", requireJwtAuth, require("./modules/orders.routes"));
app.use("/shipments", requireJwtAuth, require("./modules/shipments.routes"));
app.use("/invoices", requireJwtAuth, require("./modules/invoices.routes"));

app.use((req, res, next) => {
  return res.status(404).json({ message: "Not Found" });
});


app.use((err, req, res, next) => {
  return res.status(500).json({ message: "INTERNAL_ERROR" });
});

module.exports = app;

if (require.main === module) {
  ensureDb().then(() => {
    const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
    app.listen(PORT, () => {
      console.log(`API on http://localhost:${PORT}`);
      console.log(`\n*********************************\n      LOGIFLOW  GRUPO 14\n*********************************\n`);
    });
  }).catch((err) => {
    console.error("Failed to initialize application", err);
    process.exit(1);
  });
}
