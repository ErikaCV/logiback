const express = require("express");
const passport = require("passport");
const Users = require("../models/users.model");
const {
  hashPassword,
  verifyPassword,
  generateJwtForUser,
  sanitizeUser,
} = require("../services/auth.service");

const router = express.Router();

function ensureFlash(locals) {
  if (locals && locals.flashMessages) return locals;
  return {
    ...(locals || {}),
    flashMessages: { success: [], error: [] },
  };
}

function safeRedirect(to, fallback = "/views") {
  if (typeof to !== "string" || !to.startsWith("/")) {
    return fallback;
  }
  return to;
}

function renderLogin(req, res, overrides = {}) {
  const locals = ensureFlash({
    formValues: {
      email: overrides.formValues?.email ?? "",
      next: overrides.formValues?.next ?? req.query.next ?? "",
    },
    formErrors: overrides.formErrors || [],
  });
  return res.render("auth/login", locals);
}

function renderSignup(req, res, overrides = {}) {
  const locals = ensureFlash({
    formValues: {
      name: overrides.formValues?.name ?? "",
      email: overrides.formValues?.email ?? "",
      next: overrides.formValues?.next ?? req.query.next ?? "",
    },
    formErrors: overrides.formErrors || [],
  });
  return res.render("auth/signup", locals);
}

router.get("/login", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect("/views");
  }
  return renderLogin(req, res);
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return renderLogin(req, res, {
        formValues: { email: req.body.email || "", next: req.body.next || req.query.next || "" },
        formErrors: [info?.message || "Credenciales invalidas"],
      });
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      const redirectTo = safeRedirect(req.body.next || req.query.next);
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

router.get("/signup", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect("/views");
  }
  return renderSignup(req, res);
});

function validateSignupPayload(body = {}) {
  const errors = [];
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  if (!name) errors.push("name requerido");
  if (!email) errors.push("email requerido");
  if (!password || password.length < 6) errors.push("password minimo 6 caracteres");
  if (password !== passwordConfirm) errors.push("password no coincide");
  return { errors, name, email, password };
}

router.post("/signup", async (req, res, next) => {
  try {
    const validation = validateSignupPayload(req.body);
    const nextParam = req.body.next || req.query.next || "";
    if (validation.errors.length) {
      return renderSignup(req, res, {
        formValues: { name: validation.name, email: validation.email, next: nextParam },
        formErrors: validation.errors,
      });
    }
    if (await Users.isEmailTaken(validation.email)) {
      return renderSignup(req, res, {
        formValues: { name: validation.name, email: validation.email, next: nextParam },
        formErrors: ["email ya registrado"],
      });
    }
    const passwordHash = await hashPassword(validation.password);
    const user = await Users.create({
      name: validation.name,
      email: validation.email,
      passwordHash,
      role: "operador",
    });
    await Users.updateLastLogin(user.id);
    const safeUser = sanitizeUser(user);
    req.logIn(safeUser, (loginErr) => {
      if (loginErr) return next(loginErr);
      const redirectTo = safeRedirect(nextParam);
      return res.redirect(redirectTo);
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect("/auth/login");
    });
  });
});

function validateJsonCredentials(body = {}) {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  return { email, password, name };
}

router.post("/api/login", async (req, res) => {
  const { email, password } = validateJsonCredentials(req.body);
  if (!email || !password) {
    return res.status(400).json({ message: "EMAIL_PASSWORD_REQUIRED" });
  }
  const user = await Users.findByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "INVALID_CREDENTIALS" });
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "INVALID_CREDENTIALS" });
  }
  const updated = await Users.updateLastLogin(user.id);
  const nextUser = updated || user;
  const token = generateJwtForUser(nextUser);
  return res.json({ token, user: sanitizeUser(nextUser) });
});

router.post("/api/signup", async (req, res) => {
  const { name, email, password } = validateJsonCredentials(req.body);
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ message: "INVALID_PAYLOAD" });
  }
  if (await Users.isEmailTaken(email)) {
    return res.status(409).json({ message: "EMAIL_IN_USE" });
  }
  const passwordHash = await hashPassword(password);
  const user = await Users.create({ name, email, passwordHash, role: "operador" });
  const updated = await Users.updateLastLogin(user.id);
  const nextUser = updated || user;
  const token = generateJwtForUser(nextUser);
  return res.status(201).json({ token, user: sanitizeUser(nextUser) });
});

module.exports = router;
