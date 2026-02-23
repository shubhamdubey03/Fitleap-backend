const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const sendResetEmail = require('../email/sendResetEmail');

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // 1. find user
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. create token
        const token = uuidv4();
        console.log("tokenaaaaaaaaaaa", token);

        // const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

        await supabase.from('user_tokens').insert({
            user_id: user.id,
            token,
            token_type: 'forgot_password',
            // expires_at: expiresAt
        });

        // 3. send email
        const websiteurl = process.env.WEBSITE_URL || 'http://localhost:5173';
        const resetLink = `${websiteurl.replace(/\/$/, '')}/reset-password/${token}`;

        try {
            await sendResetEmail(user.email, resetLink, user.name);
            res.json({
                message: "Reset email sent successfully",
                email: email,
                link: resetLink   // remove in production for security, but keeping as requested
            });
        } catch (mailError) {
            console.error("Email sending failed:", mailError);
            res.status(500).json({ message: "Failed to send reset email", error: mailError.message });
        }
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const verifyResetToken = async (req, res) => {
    const { token } = req.body;

    const { data } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('token', token)
        .single();

    if (!data) {
        return res.status(400).json({ message: "Invalid token" });
    }

    // if (new Date(data.expires_at) < new Date()) {
    //     return res.status(400).json({ message: "Token expired" });
    // }

    res.json({ message: "Token valid", user_id: data.user_id });
};
module.exports = { forgotPassword, verifyResetToken };
