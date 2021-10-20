const path = require("path");
const express = require("express");
const nunjucks = require("nunjucks");
const setUpNunjucks = require("./helpers/nunjuck_helpers");
const errorController = require("./controllers/error");

const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");

const DATABASE_CONNECTION = require("./util/database").DATABASE_CONNECTION;
const User = require("./models/user");

const app = express();
const store = new MongoDBStore({
  uri: DATABASE_CONNECTION,
  collection: "sessions",
});

const csrfProtection = csrf();

app.engine("njk", nunjucks.render);
app.set("view engine", "njk");

setUpNunjucks(app);

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(csrfProtection);

app.use((req, res, next) => {
  if(!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
  .then((user) => {
    req.user = user;
    next();
  })
})


app.use((req, res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
})

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose
  .connect(DATABASE_CONNECTION)
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
