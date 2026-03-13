const transporter = require('../config/mailer');

async function sendApprovalEmail(to, name, role) {
    try {
        await transporter.sendMail({
            from: `"FitLeap" <${process.env.MAIL_FROM_ADDRESS}>`,
            to,
            subject: "Your Account has been Approved! - FitLeap",
            html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #5a003c; text-align: center;">Account Approved! 🎉</h2>
            <p>Hello ${name || 'User'},</p>
            <p>We are excited to inform you that your registration as a <strong>${role}</strong> on FitLeap has been approved by the administrator.</p>
            
            <p>You can now log in to your account and start using our platform.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://fitleap.vercel.app/" style="background-color: #5a003c; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to Login</a>
            </div>
            
            <p>If you have any questions, please feel free to contact our support team.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888; text-align: center;">Welcome to the FitLeap community!</p>
            <p style="font-size: 10px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} FitLeap. All rights reserved.</p>
          </div>
        `
        });
        console.log(`Approval email sent to ${to}`);
    } catch (error) {
        console.error('Error sending approval email:', error);
    }
}

module.exports = sendApprovalEmail;
