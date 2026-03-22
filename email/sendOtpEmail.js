const transporter = require('../config/mailer');

async function sendOtpEmail(to, otp, name) {
  console.log("FROM:", process.env.MAIL_FROM_ADDRESS);
  console.log("TO:", to); // ✅ ab defined hai
  await transporter.sendEmail({
    "From": process.env.MAIL_FROM_ADDRESS,
    "To": to,
    "Subject": "Verify Your Email - FitLeap",
    "HtmlBody": `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #5a003c; text-align: center;">Verify Your Email 👋</h2>
        <p>Hello ${name || 'User'},</p>
        <p>Thank you for signing up with FitLeap! To complete your registration, please use the following One-Time Password (OTP) to verify your email address:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #14004d; border: 2px dashed #14004d; padding: 10px 20px; border-radius: 8px; display: inline-block;">${otp}</span>
        </div>
        
        <p>This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">If you did not create an account with FitLeap, please ignore this email.</p>
        <p style="font-size: 10px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} FitLeap. All rights reserved.</p>
      </div>
    `
  });
}
module.exports = sendOtpEmail;
