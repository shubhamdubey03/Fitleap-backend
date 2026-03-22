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


const postmark = require("postmark");

const transporter = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

module.exports = transporter;
