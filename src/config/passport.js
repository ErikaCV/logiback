const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const Users = require("../models/users.model");
const { verifyPassword, sanitizeUser } = require("../services/auth.service");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: false,
    },
    async (email, password, done) => {
      try {
        const user = await Users.findByEmail(email);
        if (!user) {
          return done(null, false, { message: "Credenciales invalidas" });
        }
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Credenciales invalidas" });
        }
        await Users.updateLastLogin(user.id);
        return done(null, sanitizeUser(user));
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Users.findById(id);
    if (!user) {
      return done(null, false);
    }
    return done(null, sanitizeUser(user));
  } catch (err) {
    return done(err);
  }
});

module.exports = passport;
