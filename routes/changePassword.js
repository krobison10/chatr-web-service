const express = require('express');
const crypto = require('crypto');
const pool = require('../utilities/exports').pool;
const { generateHash, generateSalt } = require('../utilities/credentialingUtils.js');

const router = express.Router();
router.use(express.json());

router.post('/', (req, res) => {
  let { email, oldPassword, newPassword } = req.body;

  // Check if the old password and email are verified
  pool.query(
    'SELECT Members.MemberID, Credentials.SaltedHash, Credentials.SALT FROM Members INNER JOIN Credentials ON Members.MemberID = Credentials.MemberID WHERE Members.Email = $1',
    [email],
    (error, results) => {
      if (error) {
        console.error('Error retrieving user credentials:', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (results.rows.length === 0) {
          res.status(401).json({ error: 'Invalid email or password' });
        } else {
          let { MemberID, SaltedHash, SALT } = results.rows[0];
          let hashedPassword = generateHash(oldPassword, SALT);

          if (SaltedHash !== hashedPassword) {
            res.status(401).json({ error: 'Invalid email or password' });
          } else {
            // Generate a new salt and hash for the new password
            let newSalt = generateSalt(16);
            let newHashedPassword = generateHash(newPassword, newSalt);

            // Update the password in the database
            pool.query(
              'UPDATE Credentials SET SaltedHash = $1, SALT = $2 WHERE MemberID = $3',
              [newHashedPassword, newSalt, MemberID],
              (updateError) => {
                if (updateError) {
                  console.error('Error updating password:', updateError);
                  res.status(500).json({ error: 'Internal server error' });
                } else {
                  res.status(200).json({ message: 'Password updated successfully' });
                }
              }
            );
          }
        }
      }
    }
  );
});

module.exports = router;
