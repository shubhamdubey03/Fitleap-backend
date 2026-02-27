const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');


const resetPassword = async (req, res) => {
    // 0. Get token from body or params
    const token = req.body.token || req.params.token;
    const { newPassword, confirmPassword } = req.body;

    console.log("Processing reset for token:", token);

    // 1. Basic validation
    if (!token) {
        return res.status(400).json({ message: "Reset token is required" });
    }

    if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Password fields required" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // 2. Get token row
    const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('token', token)
        .single();

    if (tokenError || !tokenData) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update user password
    const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', tokenData.user_id);

    if (updateError) {
        console.error("Update password error:", updateError);
        return res.status(500).json({ message: "Failed to update password" });
    }

    // 6. Mark token used by deleting it
    await supabase
        .from('user_tokens')
        .delete()
        .eq('id', tokenData.id);

    res.json({ message: "Password reset successful" });
};
module.exports = { resetPassword };
