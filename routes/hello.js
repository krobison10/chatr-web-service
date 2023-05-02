'use strict'

/**
 * Test endpoints.
 * 
 * @author Kyler Robison
 */

const config = require('../config');

const pool = require("../utilities").pool;

const express = require('express');

const router = express.Router();

/**
 * Tests that the server is even working.
 */
router.get('/hello', (request, response) => {
    response.status(200).send({
        message: "Hello from the web service"
    });
});

/**
 * Tests the connection to the database via a simple read query.
 */
router.get('/query', (request, response) => {
    const query = `SELECT * FROM test WHERE id = 1`;
    pool
        .query(query)
        .then(result => {
            const message = result.rows[0].message;
            response.status(200).send({message});
        })
        .catch(error => {
            response.status(500).send("An error occurred");
            console.log(error);
        })
});

module.exports = router;