const express = require('express');
const crypto = require('crypto');
const pool = require('../utilities/exports').pool;
const { generateHash, generateSalt } = require('../utilities/credentialingUtils.js');

const router = express.Router();
router.use(express.json());

/**
 * @api {post} /changePassword Update password endpoint.
 * @apiName ChangePassword
 * @apiGroup Authentication - User authentication endpoints
 *
 * @apiParam {String} email The email of the user.
 * @apiParam {String} oldPassword The old password.
 * @apiParam {String} newPassword The new password.
 *
 * @apiSuccess {String} message Success message.
 *
 * @apiError (401: Unauthorized) {String} error Invalid email or password.
 * @apiError (500: Internal Server Error) {String} error Internal server error.
 */
router.post('/', (req, res) => {
  let { email, oldPassword, newPassword } = req.body;
  let loggedInMemberID; // Variable to store the logged-in user's MemberID

  // Check if the old password and email are verified
  pool.query(
    'SELECT MemberID, SaltedHash, SALT FROM Credentials WHERE MemberID IN (SELECT MemberID FROM Members WHERE Email = $1)',
    [email],
    (error, results) => {
      if (error) {
        console.error('Error retrieving user credentials:', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (results.rows.length === 0) {
          res.status(401).json({ error: 'Invalid email or password' });
        } else {
          let { memberid: MemberID, saltedhash: SaltedHash, salt: SALT } = results.rows[0];
          let hashedPassword = generateHash(oldPassword, SALT);

          if (SaltedHash !== hashedPassword) {
            res.status(401).json({ error: 'Invalid email or password' });
          } else {
            loggedInMemberID = MemberID; // Store the MemberID of the logged-in user

            // Generate a new salt and hash for the new password
            let newSalt = generateSalt(16);
            let newHashedPassword = generateHash(newPassword, newSalt);

            // Update the password in the database for the logged-in user only
            pool.query(
              'UPDATE Credentials SET SaltedHash = $1, SALT = $2 WHERE MemberID = $3',
              [newHashedPassword, newSalt, loggedInMemberID],
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
