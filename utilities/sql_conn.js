// Obtain a Pool of DB connections.
const config = require("../config.js");
const { Pool } = require("pg");

//Rest of the codebase expects that pool is the direct export, not an object containing it
module.exports = new Pool(config.DB_OPTIONS);
