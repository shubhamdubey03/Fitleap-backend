// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     host: process.env.MAIL_HOST,
//     port: process.env.MAIL_PORT,
//     secure: false, // true for 465
//     auth: {
//         user: process.env.MAIL_USERNAME,
//         pass: process.env.MAIL_PASSWORD
//     }
// });

// module.exports = transporter;


// config/resend.js
const { Resend } = require('resend');

const transporter = new Resend(process.env.RESEND_API_KEY);

module.exports = transporter;