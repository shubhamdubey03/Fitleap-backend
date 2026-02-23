const transporter = require('../config/mailer');

async function sendResetEmail(to, resetLink, name) {
    await transporter.sendMail({
        from: `"FitLeap" <${process.env.MAIL_FROM_ADDRESS}>`,
        to,
        subject: "Reset Your Password - FitLeap",
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #5a003c;">Hello ${name || 'User'}, 👋</h2>
        <p>You requested to reset your password for your FitLeap account.</p>
        <p>Please click the button below to reset your password. This link will expire in 15 minutes.</p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #14004d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="color: #666;">${resetLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
    `
    });
}

module.exports = sendResetEmail;
