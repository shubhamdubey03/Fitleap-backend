const transporter = require('../config/mailer');

async function sendVendorEmail(to, password, name) {
  await transporter.emails.send({
    from: process.env.MAIL_FROM_ADDRESS,
    to: to,
    subject: "Your Vendor Account Created",
    htmlBody: `
      <h3>Welcome ${name} 👋</h3>
      <p>Your vendor account has been created successfully.</p>
      <p><b>Email:</b> ${to}</p>
      <p><b>Password:</b> ${password}</p>
      <p>Please login and change your password.</p>
    `
  });
}

module.exports = sendVendorEmail;
