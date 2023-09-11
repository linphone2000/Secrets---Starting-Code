//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// Middle Wares
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(
  session({
    secret: "This is my secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Database
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String
});
userSchema.plugin(passportLocalMongoose); //Passport
userSchema.plugin(findOrCreate); //Passport Google OAuth 2.0
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy()); //Passport
passport.serializeUser(function(user, done) { //Passport
  done(null, user);
});
passport.deserializeUser(function(user, done) { //Passport
  done(null, user);
});
passport.use( //Passport and Google authentication
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// Routes
app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const foundUsers = await User.find({ secret: { $ne: null } });
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      } else {
        console.log("No users");
      }
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    // Handle errors appropriately, e.g., show an error page
  }
});


app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async (req, res) => {
  try {
    const submittedSecret = req.body.secret;
    const foundUser = await User.findById(req.user._id);
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      res.redirect("/secrets");
    } else {
      console.log("User not found");// Handle the case when the user is not found (e.g., show an error page)
    }
  } catch (err) {
    console.error(err);// Handle errors (e.g., show an error page)
  }
});

app.post("/register", async (req, res) => {
  User.register({ username: req.body.username },req.body.password,(err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});



app.listen(3000, () => {
  console.log("Server running on port 3000.");
});
