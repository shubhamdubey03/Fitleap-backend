const supabase = require('../../config/supabase');

exports.addDiet = async (req, res) => {
    try {
        const { user_id, coach_id, food_name, food_type, is_free } = req.body;

        if (!food_name || !food_type) {
            return res.status(400).json({ message: "food_name and food_type are required" });
        }

        // If not free, user_id is required AND subscription must be active
        if (!is_free) {
            if (!user_id || !coach_id) {
                return res.status(400).json({ message: "user_id and coach_id are required for paid diets" });
            }

            const { data: sub, error: subError } = await supabase
                .from("subscriptions")
                .select("id")
                .eq("user_id", user_id)
                .eq("coach_id", coach_id)
                .eq("status", "active")
                .eq("payment_status", "paid")
                .gte("end_date", new Date().toISOString());

            console.log("sub", sub);
            if (subError) throw subError;

            if (!sub || sub.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "User must have an active subscription with this coach to add a non-free diet."
                });
            }
        }

        const { data, error } = await supabase
            .from('user_diet')
            .insert([{
                user_id: user_id || null,   // null means global (visible to all)
                coach_id,
                food_name,
                food_type,
                is_free: is_free || false
            }])
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

exports.getFreeDiets = async (req, res) => {
    try {
        console.log("", req.params)

        const { user_id } = req.params; // optional
        console.log("user_id", user_id);
        let query = supabase
            .from('user_diet')
            .select('*')   // ✅ required
            .eq('is_free', true)
            .order('created_at', { ascending: false });

        // ✅ Apply filter properly
        if (user_id) {
            query = query.or(`user_id.eq.${user_id},user_id.is.null`);
        } else {
            query = query.is('user_id', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getUserDiet = async (req, res) => {
    try {
        const { user_id } = req.params;

        // 1️⃣ Check if user has an active subscription
        const { data: sub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .eq("payment_status", "paid")
            .gte("end_date", new Date().toISOString())
            .limit(1);

        const isSubscribed = sub && sub.length > 0;

        // 2️⃣ Fetch user-specific diets
        let query = supabase
            .from('user_diet')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        // If NOT subscribed → only return diets where is_free = true
        if (!isSubscribed) {
            query = query.eq('is_free', true);
        }

        const { data: userDiets, error: dietError } = await query;
        if (dietError) throw dietError;

        // 3️⃣ Always fetch global free diets (user_id = null, is_free = true)
        const { data: globalFreeDiets, error: globalError } = await supabase
            .from('user_diet')
            .select('*')
            .eq('is_free', true)
            .is('user_id', null)
            .order('created_at', { ascending: false });

        if (globalError) throw globalError;

        // 4️⃣ Merge and deduplicate by id
        const allDiets = [...(userDiets || []), ...(globalFreeDiets || [])];
        const uniqueDiets = Object.values(
            allDiets.reduce((acc, d) => { acc[d.id] = d; return acc; }, {})
        );

        res.json({
            success: true,
            is_subscribed: isSubscribed,
            data: uniqueDiets
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};