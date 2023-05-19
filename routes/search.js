const express = require('express');

const pool = require('../utilities/exports').pool;

const router = express.Router();

const validation = require('../utilities').validation;
let isStringProvided = validation.isStringProvided;

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 
/**
 * @api {get} /search/:query? Request users matching query
 * @apiName GetUsers
 * @apiGroup Search
 * 
 * @apiDescription Produces a list of users matching the given search query.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {String} query the search query
 * 
 * @apiSuccess {Number} rowCount the number of users returned
 * @apiSuccess {Object[]} users list of users returned 
 * @apiSuccess {String} users.username username of the user
 * @apiSuccess {String} users.email email of the user
 * @apiSuccess {String} users.firstname first name of the user
 * @apiSuccess {String} users.lastname last name of the user
 * 
 * @apiError (400: Missing Parameter) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/:query?", (request, response, next) => {
    //validate non-missing or invalid (type) parameters
    if (!request.params.query) {
        request.params.query = "";
    } 
    next();
}, (request, response) => {
    const query =   `
                        SELECT username, email, firstname, lastname 
                        FROM members 
                        WHERE username ILIKE $1 
                        AND memberid != $2
                        AND memberid NOT IN (   SELECT memberid_b as "userId"
                                                FROM contacts
                                                WHERE memberid_a=$2
                                                UNION ALL
                                                SELECT memberid_a as "userId"
                                                FROM contacts
                                                WHERE memberid_b=$2
                                            )
                    `
    const values = [`%${request.params.query}%`, request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            const rows = 50;
            const list = result.rows.slice(0, rows);
            response.status(200).send({
                rowCount : list.length,
                users: list
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
});

module.exports = router;