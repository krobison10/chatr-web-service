/**
 * Framework used to handle requests.
 */
const express = require("express");
/**
 * Connection to Heroku Database.
 */
const pool = require("../utilities").pool;

const nodemailer = require('nodemailer');

const validation = require("../utilities").validation;
const isStringProvided = validation.isStringProvided;

const { generatePassword, generateHash, generateSalt } = require("../utilities");

const registerUtils = require("../utilities").registerUtils;

const router = express.Router();

/**
 * @api {post} /auth Request to register a user
 * @apiName PostAuth
 * @apiGroup Auth
 *
 * @apiBody {String} first a users first name
 * @apiBody {String} last a users last name
 * @apiBody {String} email a users email *unique
 * @apiBody {String} password a users password
 * @apiBody {String} [username] a username *unique, if none provided, email will be used
 *
 * @apiParamExample {json} Request-Body-Example:
 *    {
 *        "first":"Charles",
 *        "last":"Bryan",
 *        "email":"cfb3@fake.email",
 *        "password":"test12345"
 *    }
 *
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {String} email the email of the user inserted
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (400: Username exists) {String} message "Username exists"
 *
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 */
router.post(
    "/",
    // Verify JSON has all fields
    (request, response, next) => { 
        request.body.username = isStringProvided(request.body.username)
            ? request.body.username
            : request.body.email;

        // Verify that the caller supplied all the parameters
        // In js, empty strings or null values evaluate to false
        if (
            isStringProvided(request.body.first)
            && isStringProvided(request.body.last)
            && isStringProvided(request.body.username)
            && isStringProvided(request.body.email)
            && isStringProvided(request.body.password)
        ) {
            next();
        } else {
            response.status(400).send({
                message: "Missing required information",
            });
        }
    },
    // Verify the input data meets the requirements
    (request, response, next) => { 
        if(registerUtils.checkPassword(request.body.password)) {
            next();
        } else {
            response.status(401).send({
                message: "Password does not meet requirements"
            });
        } 
    },
    // Verify that credentials don't already exist
    (request, response, next) => {
        // We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
        // If you want to read more: https://stackoverflow.com/a/8265319
        let theQuery =
            "INSERT INTO MEMBERS(FirstName, LastName, Username, Email) VALUES ($1, $2, $3, $4) RETURNING Email, MemberID";
        let values = [
            request.body.first,
            request.body.last,
            request.body.username,
            request.body.email,
        ];
        pool
            .query(theQuery, values)
            .then((result) => {
                // Stash the memberid into the request object to be used in the next function
                request.memberid = result.rows[0].memberid;
                next();
            })
            .catch((error) => {
                if (error.constraint == "members_username_key") {
                    response.status(400).send({
                        message: "Username exists",
                    });
                } else if (error.constraint == "members_email_key") {
                    response.status(400).send({
                        message: "Email exists",
                    });
                } else {
                    console.log(error);
                    response.status(400).send({
                        message: "other error, see detail",
                        detail: error.detail,
                    });
                }
            });
    },
    // Insert user into database
    (request, response) => {
        const salt = generateSalt(32);
        const salted_hash = generateHash(request.body.password, salt);

        const theQuery = "INSERT INTO CREDENTIALS(MemberId, SaltedHash, Salt) VALUES ($1, $2, $3)";
        const values = [request.memberid, salted_hash, salt];
        pool
            .query(theQuery, values)
            .then((result) => { // User successfully added
                response.status(201).send({
                    success: true,
                    email: request.body.email,
                });
            })
            .catch((error) => {
                // TODO: Remove the user from member table if there was an error inserting password.
                response.status(400).send({
                    message: "other error, see detail",
                    detail: error.detail,
                });
            });
    }
);
/**
 * @api {put} /auth/reset Request to reset a user's password
 * @apiName PutAuthReset
 * @apiGroup Auth
 *
 * @apiBody {String} email a users email
 *
 * @apiParamExample {json} Request-Body-Example:
 *   {
 *    "email":"exampleuseremail@gmail.com"
 *  }
 *
 * @apiSuccess (Success 201) {boolean} success true when the password is updated
 * @apiSuccess (Success 201) {String} email the email of the user updated
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (404: Email Not Found) {String} message "Email not found"
 *
 * @apiError (400: Other Errors) {String} message "other error, see detail"
 *
 * @apiError (400: Other Errors) {String} detail Information about the error
*/
router.put('/reset', (request, response, next) => {
    if (isStringProvided(request.body.email)) {
        next();
    } else {
        response.status(400).send({
            message: "Missing required information",
        });
    }
}, (request, response, next) => {

    let theQuery = "SELECT * FROM Members WHERE Email=$1";
    let values = [request.body.email];
    pool.query(theQuery, values)
        .then((result) => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Email not found",
                });
            } else {
                request.memberid = result.rows[0].memberid;
                next();
            }
        })
        .catch((error) => {
            console.log(error);
            response.status(400).send({
                message: "other error, see detail",
                detail: error.detail,
            });
        });
}, (request, response, next) => {
    // Generate a new temporary password
    request.body.password = generatePassword();
    let theQuery = "UPDATE Credentials SET SaltedHash=$1, Salt=$2 WHERE MemberId=$3";
    const salt = generateSalt(32);
    const salted_hash = generateHash(request.body.password, salt);
    let values = [salted_hash, salt, request.memberid];
    pool.query(theQuery, values)
        .then((result) => {
            next();
        })
        .catch((error) => {
            console.log(error);
            response.status(400).send({
                message: "other error, see detail",
                detail: error.detail,
            });
        });
}, (request, response) => {
    // Send the email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'chatrapptcss450@gmail.com',
            pass: 'ebxcsdsykiufsgjb'
        }
    });

    const mailOptions = {
        to: request.body.email,
        subject: 'Chatr Password Reset Instructions',
        text: 'Please login to your account using your temporary password, then change your password within the app. Your temporary password is: ' + request.body.password
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            esponse.status(400).send({
                message: "error occurred sending email, see detail",
                detail: error.detail,
            });
        } else {
            console.log(`Temporary password for ${request.body.email}: ${request.body.password}`);
            response.status(201).send({
                success: true,
                code: request.body.password
            });
        }
    });
});


router.get("/hash_demo", (request, response) => {
    const password = "hello12345";

    const salt = generateSalt(32);
    const salted_hash = generateHash(password, salt);
    const unsalted_hash = generateHash(password);

    response.status(200).send({
        salt: salt,
        salted_hash: salted_hash,
        unsalted_hash: unsalted_hash,
    });
});

module.exports = router;
