//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] }); //This must be done before defining schema
const User = mongoose.model("User", userSchema);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  const newUser = new User({
    email: req.body.email,
    password: req.body.password,
  });
  try {
    await newUser.save();
    res.render("secrets");
  } catch (error) {
    res.send(error);
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const foundUser = await User.findOne({ email: email });
    if (foundUser) {
      if (foundUser.password == password) {
        res.render("secrets");
      } else {
        res.send("Wrong password.");
      }
    } else {
      res.send("No User");
    }
  } catch (error) {
    res.send(error);
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000.");
});
