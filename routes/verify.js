const express = require('express');

const pool = require("../utilities/exports").pool;

const router = express.Router();

const nodemailer = require('nodemailer');

const { isStringProvided } = require("../utilities/exports").validation;

const registerUtils = require("../utilities/exports").registerUtils;

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 
/**
 * @api {post} /verify/email? Request to send a verification email to the user
 * @apiName PostVerify
 * @apiGroup Verify
 * 
 * @apiSuccess (Success 201) {boolean} success true when the email is sent successfully
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (404: Unknown User) {String} message "unknown email address"
 * 
 * @apiError (400: Mailing Error) {String} error the provided error details
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 *
 * @apiUse JSONError
 */
router.post("/:email?", (request, response, next) => {
    // validate non-missing or invalid (type) parameters
    if (!request.params.email) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else next()
}, (request, response, next) => {
    // verify the user exists
    const query = `SELECT * FROM members WHERE email = $1`
    const values = [request.params.email]

    pool
        .query(query, values)
        .then(result => {
            if(result.rowCount == 0) {
                response.status(404).send({
                    message: "unknown email address"
                })
            }
            else {
                next();
            }
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response, next) => {
    // apply changes to verification table
    const query =   `
                        SELECT * FROM verification 
                        RIGHT JOIN members 
                        ON verification.memberid = members.memberid 
                        WHERE members.email = $1
                    `
    const values = [request.params.email]

    pool
        .query(query, values)
        .then(result => {
            //Apply correct changes to table
            request.verificationCode = Math.floor(10000 + Math.random() * 90000); //Generate 5 digit code

            const insertQuery = !result.rows[0].code ?
                `INSERT INTO verification (memberid, code) VALUES($1, $2)` 
                : `UPDATE verification SET code = $2 WHERE memberid = $1`

            const values = [result.rows[0].memberid, request.verificationCode]
            
            pool
                .query(insertQuery, values)
                .then(result => {
                    next()
                })
                .catch(err => {
                    response.status(400).send({
                        message: "SQL Error",
                        error: err
                    })
                })   
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response) => {
    // Send the code to the user's email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'chatrapptcss450@gmail.com',
            pass: 'ebxcsdsykiufsgjb'
        }
    });

    const mailOptions = {
        to: request.params.email,
        subject: 'Chatr Verification Code',
        text: 'Your code is: ' + request.verificationCode
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            response.status(400).send({
                error
            })
        } else {
            response.status(201).json({
                success: true,
                code: request.verificationCode
            });
        }
    });
})


/**
 * @api {put} /verify/:email? Request to verify a user with a code
 * @apiName PutVerify
 * @apiGroup Verify
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiBody {String} verificationCode code entered by the user
 * 
 * @apiSuccess (Success 200) {boolean} success true when the user is verified
 * 
 * @apiError (404: Unknown User) {String} message "unknown email address"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: Incorrect Code) {String} message "The provided code is incorrect"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 *
 * @apiUse JSONError
 */ 
router.put("/:email?", (request, response, next) => {
    // validate non-missing or invalid (type) parameters
    if (request.params.email && request.body.verificationCode) {
        next();
    } else {
        response.status(400).send({
            message: "Missing required information"
        });
    }
}, (request, response, next) => {
    //Check if verification exists and then compare codes
    const query =   `
                    SELECT verification.memberid, verification.code FROM verification
                    JOIN members ON verification.memberid = members.memberid
                    WHERE members.email = $1
                    `    
    const values =  [request.params.email]
    pool
        .query(query, values)
        .then(result => {
            if(result.rowCount === 0) {
                response.status(404).send({
                    message: "Verification details not found"
                })
            }
            //Check if codes match
            else if(request.body.verificationCode !== result.rows[0].code) {
                response.status(400).send({
                    message: "The provided code is incorrect"
                })
            }
            else {
                request.memberid = result.rows[0].memberid;
                next()
            }
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response) => {
    //Delete from verification table
    let query = `UPDATE members SET verified = TRUE WHERE memberid = $1`    
    pool
        .query(query, [request.memberid])
        .then(result => {
            query = `DELETE FROM verification WHERE memberid = $1`
            pool
                .query(query, [request.memberid])
                .then(result => {
                    response.status(200).send({
                        success: true
                    })
                })
                .catch(err => {
                    response.status(400).send({
                        message: "SQL Error",
                        error: err
                    })
                })
        })
        .catch(err => {
        response.status(400).send({
            message: "SQL Error",
            error: err
        })
    })
});

module.exports = router;
