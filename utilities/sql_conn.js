// Obtain a Pool of DB connections.
const config = require("../config.js");
const { Pool } = require("pg");

module.exports = {
    pool: new Pool(config.DB_OPTIONS),
}
