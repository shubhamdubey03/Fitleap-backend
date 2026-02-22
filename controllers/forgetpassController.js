const supabase = require('../config/supabase');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
// const jwt = require('jsonwebtoken');
require('dotenv').config();


// Email config (Gmail example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        // console.log("wwwwwwwwwwwwww", email);

        const user = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        // console.log("ffff", user)

        if (!user) return res.status(404).json({ msg: 'User not found' });
        // generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await supabase
            .from('users')
            .update({
                reset_token: hashedToken,
                reset_token_expiry: expiry,
            })
            .eq('id', user.id);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        // console.log("process.env.FRONTEND_URL", process.env.FRONTEND_URL)
        // console.log("resetLinkoooooooooooo", resetLink)
        await transporter.sendMail({
            to: email,
            subject: 'Reset your password',
            html: `<p>Click here to reset:</p><a href="${resetLink}">${resetLink}</a>`,
        });
        console.log("jjjjjjjj", resetLink)

        res.json({ msg: 'Reset email sent' });


    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('reset_token', hashedToken)
            .gt('reset_token_expiry', new Date())
            .single();

        if (!user) return res.status(400).json({ msg: 'Token invalid or expired' });

        const newPassword = await bcrypt.hash(password, 10);

        await supabase
            .from('users')
            .update({
                password: newPassword,
                reset_token: null,
                reset_token_expiry: null,
            })
            .eq('id', user.id);

        res.json({ msg: 'Password reset successful' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

