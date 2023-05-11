// Crypto utility functions
const credUtils = require('./credentialingUtils')

module.exports = { 
    pool: require('./sql_conn.js'), // Connection to Heroku Database
    generateHash: credUtils.generateHash,
    generateSalt: credUtils.generateSalt,
    validation: require('./validationUtils.js'),
    sendEmail: require('./email.js').sendEmail,
    registerUtils: require('./registerUtils')
}
