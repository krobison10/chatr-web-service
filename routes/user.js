const express = require('express');
const router = express.Router();
const pool = require('../utilities/exports').pool;
const validation = require('../utilities').validation;
const isStringProvided = validation.isStringProvided;

// Endpoint to get user information
router.get('/', (req, res) => {
  console.log(req.headers);
  const memberId = req.decoded.memberid;


  // Query the database to retrieve user information using the memberId
  console.log('Decoded Member ID:', memberId);

  const query = {
    text: 'SELECT FirstName, LastName, Username FROM Members WHERE MemberID = $1',
    values: [memberId]
  };

  pool.query(query)
    .then(result => {
      console.log('Query result:', result); 
      if (result.rows.length === 0) {
        console.log('No rows found in the database');
        // User not found
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // User found, return the information
      const user = result.rows[0];
      console.log('User object:', user);
      return res.status(200).json({
        success: true,
        firstName: user.firstname,
        lastName: user.lastname,
        username: user.username
      });
      
      
    })
    .catch(error => {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });
});

module.exports = router;

