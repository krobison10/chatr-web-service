const config = require("./config.js");
/**
 * The framework used to handle requests.
 */
const express = require("express");
/**
 * The framework instance.
 */
const app = express();
/**
 * The connection to Heroku Database.
 */
const pool = require("./utilities").pool;

const middleware = require("./middleware");

app.use(express.json());

app.use(middleware.jsonErrorInBody);

app.use('/test', require('./routes/hello.js'));

app.use('/auth', require('./routes/register.js'));

app.use('/auth', require('./routes/login.js'));

app.use("/doc", express.static('apidoc'));

app.use('/verify', require('./routes/sendEmail.js'));

app.listen(config.PORT || 5000, () => {
  console.log("Server up and running on port: " + (config.PORT || 5000));
});
