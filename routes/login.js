const config = require("../config.js");
/**
 * Framework used to handle requests,
 */
const express = require("express");
/** 
 * Connection to Heroku Database.
 */
const pool = require("../utilities/exports.js").pool;

const validation = require("../utilities/exports.js").validation;
const isStringProvided = validation.isStringProvided;

const generateHash = require("../utilities/exports.js").generateHash;

const router = express.Router();

// Pull in the JWT module along with the secret key
const jwt = require("jsonwebtoken");
const key = {
    secret: config.JSON_WEB_TOKEN,
};

/**
 * @api {get} /auth Request to log a user into the system
 * @apiName GetAuth
 * @apiGroup Auth
 *
 * @apiHeader {String} authorization "username:password" uses Basic Auth
 *
 * @apiSuccess {boolean} success true when the name is found and password matches
 * @apiSuccess {String} message "Authentication successful!"
 * @apiSuccess {String} token JSON Web Token
 *
 *    * @apiSuccessExample {json} Success-Response:
 *         HTTP/1.1 200 OK
 *         {
 *             "success": true,
 *             "message": "Authentication successful!",
 *             "token": "eyJhbGciO...abc123"
 *         }
 *
 * @apiError (400: Missing Authorization Header) {String} message "Missing Authorization Header"
 *
 * @apiError (400: Malformed Authorization Header) {String} message "Malformed Authorization Header"
 *
 * @apiError (404: User Not Found) {String} message "User not found"
 *
 * @apiError (400: Invalid Credentials) {String} message "Credentials did not match"
 *
 */
router.get("/",
    (request, response, next) => {
        if (
            isStringProvided(request.headers.authorization)
            && request.headers.authorization.startsWith("Basic ")
        ) {
            next();
        } else {
            response.status(400).json({ message: "Missing Authorization Header" });
        }
    },
    (request, response, next) => {
        // Obtain auth credentials from HTTP Header
        const base64Credentials = request.headers.authorization.split(" ")[1];

        const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");

        const [email, password] = credentials.split(":");

        if (isStringProvided(email) && isStringProvided(password)) {
            request.auth = {
                email: email,
                password: password,
            };
            next();
        } else {
            response.status(400).send({
                message: "Malformed Authorization Header",
            });
        }
    },
    (request, response) => {
        const theQuery = `SELECT saltedhash, salt, Credentials.memberid FROM Credentials
                                        INNER JOIN Members ON
                                        Credentials.memberid=Members.memberid
                                        WHERE Members.email=$1`;
        const values = [request.auth.email];
        pool
            .query(theQuery, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(404).send({
                        message: "User not found",
                    });
                    return;
                }

                // Retrieve the salt used to create the salted-hash provided from the DB
                const salt = result.rows[0].salt;

                // Retrieve the salted-hash password provided from the DB
                const storedSaltedHash = result.rows[0].saltedhash;

                // Generate a hash based on the stored salt and the provided password
                const providedSaltedHash = generateHash(request.auth.password, salt);

                // Did our salted hash match their salted hash?
                if (storedSaltedHash === providedSaltedHash) { // Creditial match
                    const token = jwt.sign(
                        {
                            email: request.auth.email,
                            memberid: result.rows[0].memberid,
                        },
                        key.secret,
                        {
                            expiresIn: "14 days", // expires in 14 days
                        }
                    );
                    response.json({
                        success: true,
                        message: "Authentication successful!",
                        token: token,
                    });
                } else { // Credential mismatch
                    response.status(400).send({
                        message: "Credentials did not match",
                    });
                }
            })
            .catch((err) => { // Log error
                response.status(400).send({
                    message: err.detail,
                });
            });
    }
);

module.exports = router;
