const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');


const resetPassword = async (req, res) => {
    const { token } = req.body;
    console.log("tokenttttttttttttt", token);
    const { newPassword, confirmPassword } = req.body;

    // 1. Basic validation
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
    const tokenRow = await supabase
        .from('user_tokens')
        .select('*')
        .eq('token', token)
        .single();

    console.log(";;;;;;;;;", tokenRow);

    if (!tokenRow) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    // // 3. Expiry check
    // if (new Date(tokenRow.expires_at) < new Date()) {
    //     return res.status(400).json({ message: "Token expired" });
    // }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("hashedPassword", hashedPassword);

    // 5. Update user password
    const { data, error } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', tokenRow.data.user_id);

    console.log("data", data);
    console.log("error", error);

    // 6. Mark token used
    await supabase
        .from('user_tokens')
        .delete()
        .eq('id', tokenRow.id);

    res.json({ message: "Password reset successful" });
};
module.exports = { resetPassword };
