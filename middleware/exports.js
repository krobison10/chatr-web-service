module.exports = {
    checkToken: require('./jwt.js').checkToken, 
    jsonErrorInBody: require('./handleErrors.js').jsonErrorInBody,
}