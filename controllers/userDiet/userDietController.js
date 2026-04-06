const supabase = require('../../config/supabase');

exports.addDiet = async (req, res) => {
    try {

        const { user_id, coach_id, food_name, food_type, is_free } = req.body;
        if (!user_id || !coach_id || !food_name || !food_type) {
            return res.status(400).json({ message: "All fields required" });
        }

        if (!is_free) { // Only check for subscription if it's not a free diet
            // Check for active subscription
            const { data: sub, error: subError } = await supabase
                .from("subscriptions")
                .select("id")
                .eq("user_id", user_id)
                .eq("coach_id", coach_id)
                .eq("status", "active")
                .eq("payment_status", "paid")
                .gte("end_date", new Date().toISOString())
                .maybeSingle(); // Use maybeSingle to get null if no row found

            console.log("sub", sub);
            if (subError) throw subError;

            if (!sub) {
                return res.status(403).json({
                    success: false,
                    message: "User must have an active subscription with this coach to add a non-free diet."
                });
            }
        }

        const { data, error } = await supabase
            .from('user_diet')
            .insert([
                {
                    user_id,
                    coach_id,
                    food_name,
                    food_type,
                    is_free: is_free || false
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: "Diet added successfully",
            data
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getUserDiet = async (req, res) => {
    try {

        const { user_id } = req.params;

        const { data, error } = await supabase
            .from('user_diet')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};