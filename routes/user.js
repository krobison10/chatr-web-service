const express = require('express');
const router = express.Router();
const pool = require('../utilities/exports').pool;
const validation = require('../utilities').validation;
const isStringProvided = validation.isStringProvided;

// Endpoint to get user information
router.get('/', (req, res) => {
  const memberId = req.decoded.memberid;


  // Query the database to retrieve user information using the memberID
  const query = {
    text: 'SELECT FirstName, LastName, Username FROM Members WHERE MemberID = $1',
    values: [memberId]
  };

  pool.query(query)
    .then(result => {
      if (result.rows.length === 0) {

        // User not found
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // User found, return the information
      const user = result.rows[0];
      return res.status(200).json({
        success: true,
        firstName: user.firstname,
        lastName: user.lastname,
        username: user.username
      });
      
      
    })
    .catch(error => {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });
});

module.exports = router;

