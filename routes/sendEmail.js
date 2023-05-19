const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require("../utilities").pool;
const { isStringProvided } = require("../utilities").validation;
const registerUtils = require("../utilities").registerUtils;

const sendEmailMiddleware = async (req, res, next) => {
  const { email } = req.body; // the email is sent in the request body
 // console.log('Email:', email);

  // Generate a random OTP code
  const otp = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit OTP code

  try {
    console.log('Email:', email);
    console.log('OTP:', otp);

    // Store the OTP code in the database
    const updateOTPQuery = `
      INSERT INTO OTPVerification (MemberID, OTPCode, Verification)
      SELECT MemberID, $1, 0
      FROM Members
      WHERE Email = $2
      RETURNING MemberID
    `;
    const result = await pool.query(updateOTPQuery, [otp, email]);

    if (result.rowCount === 1) {
      // Send the OTP code to the user's email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'chatrapptcss450@gmail.com',
          pass: 'ebxcsdsykiufsgjb'
        }
      });

      const mailOptions = {
        to: email,
        subject: 'OTP Verification',
        text: 'Your OTP code is: ' + otp
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          next(error);
        } else {
          console.log('Email sent: ' + info.response);
          res.status(200).json({
            message: 'Email sent successfully',
            otp: otp
          });
        }
      });
    } else {
      throw new Error('Failed to store OTP code in the database');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const verifyOTPMiddleware = (req, res, next) => {
  console.log('Request Body:', req.body);

  const { email, otp } = req.body;
  console.log('Received Email:', email);
  console.log('Received OTP:', otp);
  const verifyOTPQuery = `
    SELECT Verification
    FROM OTPVerification
    WHERE MemberID = (
      SELECT MemberID
      FROM Members
      WHERE Email = $1
    ) AND OTPCode = $2
  `;
  const updateVerificationQuery = `
    UPDATE OTPVerification
    SET Verification = 1
    WHERE MemberID = (
      SELECT MemberID
      FROM Members
      WHERE Email = $1
    ) AND OTPCode = $2
  `;
  pool.query(verifyOTPQuery, [email, otp])
    .then(result => {
     // console.log('Verification Result:', result.rows);
      //console.log('Verification Result Length:', result.rows.length);
      
      if (result.rows.length > 0 && result.rows[0].verification === 0) {
        pool.query(updateVerificationQuery, [email, otp])
          .then(() => {
            next();
          })
          .catch(error => {
            console.error('Failed to update verification status:', error);
            res.status(500).send({
              message: 'Failed to update verification status: ' + error,
            });
          });
      } else {
       // console.log('Verification Result Mismatch:', result.rows[0]?.verification); 
        res.status(401).send({
          message: 'OTP mismatch',
        });
      }
    })
    .catch(error => {
      console.error('Verification Error:', error);
      res.status(400).send({
        message: 'Error occurred during OTP verification: ' + error,
      });
    });
};
router.post('/', async (req, res, next) => {
  try {
    const { email } = req.body;

    // Generate a new OTP code
    const otp = Math.floor(1000 + Math.random() * 9000); // Generates a new 4-digit OTP code

    // Update the OTP code in the database
    const updateOTPQuery = `
      UPDATE OTPVerification
      SET OTPCode = $1, Verification = 0
      WHERE MemberID = (
        SELECT MemberID
        FROM Members
        WHERE Email = $2
      )
    `;
    await pool.query(updateOTPQuery, [otp, email]);

    // Send the new OTP code to the user's email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chatrapptcss450@gmail.com',
        pass: 'ebxcsdsykiufsgjb'
      }
    });

    const mailOptions = {
      to: email,
      subject: 'OTP Verification',
      text: 'Your new OTP code is: ' + otp
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        next(error);
      } else {
        console.log('Email sent: ' + info.response);
        res.status(200).json({
          message: 'New OTP code sent successfully',
          otp: otp
        });
      }
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post('/send-email', sendEmailMiddleware);
router.post('/verify-otp', verifyOTPMiddleware, (req, res,next) => {
  res.status(201).send({
    message: 'OTP verified successfully',
  });
});
module.exports = router;
