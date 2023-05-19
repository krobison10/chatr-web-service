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
 * @api {get} /contacts/current Request all current contacts
 * @apiName GetContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Produces a list of contacts and basic info about each 
 * for the user associated with the JWT.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {Number} rowCount the number of contacts returned
 * @apiSuccess {Object[]} contacts list of contacts returned 
 * @apiSuccess {Number} contacts.connectionId id of the connection
 * @apiSuccess {String} contacts.username username of the user
 * @apiSuccess {String} contacts.email email of the user
 * @apiSuccess {String} contacts.firstname first name of the user
 * @apiSuccess {String} contacts.lastname last name of the user
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/current", (request, response) => {
    const query =   `
                        SELECT nested.connectionId, members.username, members.email, members.firstname, members.lastname FROM 
                            (SELECT memberid_b as "userId", verified, connectionId
                                FROM contacts
                                WHERE memberid_a=$1
                                UNION ALL
                                SELECT memberid_a as "userId", verified, connectionId
                                FROM contacts
                                WHERE memberid_b=$1) AS "nested"
                        LEFT JOIN members
                        ON nested."userId" = members.memberId
                        WHERE nested.verified = TRUE
                    `
    const values = [request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            response.status(200).send({
                rowCount : result.rowCount,
                contacts: result.rows
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
});

/**
 * @api {get} /contacts/outgoing Request all outgoing contact requests
 * @apiName GetContactsOut
 * @apiGroup Contacts
 * 
 * @apiDescription Produces a list of outgoing contact requests and basic info about each 
 * for the user associated with the JWT.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {Number} rowCount the number of contacts returned
 * @apiSuccess {Object[]} contacts list of contacts returned 
 * @apiSuccess {Number} contacts.connectionId id of the connection
 * @apiSuccess {String} contacts.username username of the user
 * @apiSuccess {String} contacts.email email of the user
 * @apiSuccess {String} contacts.firstname first name of the user
 * @apiSuccess {String} contacts.lastname last name of the user
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/outgoing", (request, response) => {
    const query = `SELECT contacts.connectionId, members.username, members.email, members.firstname, members.lastname FROM contacts
                        JOIN members
                        ON contacts.memberid_b = members.memberId
                        WHERE contacts.memberid_a = $1 AND contacts.verified = FALSE
                `
    const values = [request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            response.status(200).send({
                rowCount : result.rowCount,
                contacts: result.rows
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
});

/**
 * @api {get} /contacts/incoming Request all incoming contact requests
 * @apiName GetContactsIn
 * @apiGroup Contacts
 * 
 * @apiDescription Produces a list of incoming contact requests and basic info about each 
 * for the user associated with the JWT.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {Number} rowCount the number of contacts returned
 * @apiSuccess {Object[]} contacts list of contacts returned 
 * @apiSuccess {Number} contacts.connectionId id of the connection
 * @apiSuccess {String} contacts.username username of the user
 * @apiSuccess {String} contacts.email email of the user
 * @apiSuccess {String} contacts.firstname first name of the user
 * @apiSuccess {String} contacts.lastname last name of the user
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/incoming", (request, response) => {
    const query = `SELECT contacts.connectionId, members.username, members.email, members.firstname, members.lastname FROM contacts
                        JOIN members
                        ON contacts.memberid_a = members.memberId
                        WHERE contacts.memberid_b = $1 AND contacts.verified = FALSE
                `
    const values = [request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            response.status(200).send({
                rowCount : result.rowCount,
                contacts: result.rows
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
});

/**
 * @api {post} /contacts/:userEmail? Request create new contact request
 * @apiName PostContactRequest
 * @apiGroup Contacts
 * 
 * @apiDescription Creates a new contact request
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {String} userEmail email of the user to send the request to
 * 
 * @apiSuccess {boolean} success true if the action was successful
 * 
 * @apiError (400: Missing Parameter) message "Missing required information"
 * @apiError (404: Request not Found) message "No incoming request with specified id found for user"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.post("/:userEmail?", (request, response, next) => {
    //validate non-missing or invalid (type) parameters
    if (!request.params.userEmail) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //check that user exists
    const query =   `SELECT memberid FROM members WHERE email = $1`
    const values = [request.params.userEmail]

    pool.query(query, values)
        .then(result => {
            if(result.rowCount > 0) {
                request.targetId = result.rows[0].memberid;
                next();
            }
            else {
                response.status(404).send({
                    message: "User not found"
                })
            }
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response, next) => {
    //Check that there is no connection between the users already
    const query =   `
                        SELECT * FROM contacts
                        WHERE memberid_a = $1 AND memberid_b = $2
                        UNION ALL
                        SELECT * FROM contacts
                        WHERE memberid_a = $2 and memberid_b = $1
                    `
    const values = [request.decoded.memberid, request.targetId]
    pool.query(query, values)
        .then(result => {
            if(result.rowCount > 0) {
                response.status(400).send({
                    message: "Connection already exists"
                })
            } else {
                next();
            }
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response) => {
    //Create connection
    const query =  `INSERT INTO contacts(memberid_a, memberid_b) VALUES($1, $2) RETURNING connectionid`
    const values = [request.decoded.memberid, request.targetId]
    pool.query(query, values)
        .then(result => {
            response.status(201).send({
                success: true,
                connectionId: result.rows[0].connectionid
            })
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })   
});

/**
 * @api {put} /contacts/accept/:connId? Request confirm incoming contact request
 * @apiName PutContactAccept
 * @apiGroup Contacts
 * 
 * @apiDescription Confirms a pending connection given a connection id.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} connId id of the connection to confirm
 * 
 * @apiSuccess {boolean} success true if the action was successful
 * 
 * @apiError (400: Missing Parameter) message "Missing required information"
 * @apiError (400: Invalid Parameter) message "Malformed parameter: connId must be a number"
 * @apiError (404: Request not Found) message "No incoming request with specified id found for user"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.put("/accept/:connId?", (request, response, next) => {
    //validate non-missing or invalid (type) parameters
    if (!request.params.connId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.connId)) {
        response.status(400).send({
            message: "Malformed parameter: connId must be a number"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //check that request is incoming and for the user associated with the JWT
    const query =   `
                    SELECT * FROM contacts
                    WHERE connectionId = $1 AND memberid_b = $2
                    `
    const values = [request.params.connId, request.decoded.memberid]

    pool.query(query, values)
        .then(result => {
            if(result.rowCount > 0) {
                next();
            }
            else {
                response.status(404).send({
                    message: "No incoming request with specified id found for user"
                })
            }
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response) => {
    //Confirm the connection
    const query = `UPDATE contacts SET verified = TRUE WHERE connectionId = $1`
    const values = [request.params.connId]
    pool.query(query, values)
        .then(result => {
            response.status(201).send({
                success: true
            })
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
});

/**
 * @api {delete} /contacts/:connId? Request delete a contact
 * @apiName DeleteContact
 * @apiGroup Contacts
 * 
 * @apiDescription Deletes a connection in any state, verified or not
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} connId id of the connection to delete
 * 
 * @apiSuccess {boolean} success true if the action was successful
 * 
 * @apiError (400: Missing Parameter) message "Missing required information"
 * @apiError (400: Invalid Parameter) message "Malformed parameter: connId must be a number"
 * @apiError (404: Contact not Found) message "Contact id not found or associated with user"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.delete("/:connId?", (request, response, next) => {
    //validate non-missing or invalid (type) parameters
    if (!request.params.connId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.connId)) {
        response.status(400).send({
            message: "Malformed parameter: connId must be a number"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //confirm that the contact exists and that the current user is one of the parties
    const query =   `
                    SELECT * FROM contacts
                    WHERE connectionId = $1 AND (memberid_a = $2 OR memberid_b = $2)
                    `
    const values = [request.params.connId, request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            if(result.rowCount > 0) {
                next();
            } else {
                response.status(404).send({
                    message: "Contact id not found or associated with user"
                })
            }
        })
        .catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })            
        })
}, (request, response,) => {
    const query = `DELETE FROM contacts WHERE connectionId = $1`;
    const values = [request.params.connId];

    pool.query(query, values)
        .then(result => {
            response.status(201).send({
                success: true
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