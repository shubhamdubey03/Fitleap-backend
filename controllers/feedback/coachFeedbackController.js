const supabase = require('../../config/supabase');

exports.giveCoachFeedback = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { coach_id } = req.params;
        const { subscription_id, rating, review } = req.body;
        console.log("coach_id param:", coach_id);
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // 1️⃣ Validate active subscription
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', subscription_id)
            .eq('user_id', user_id)
            .eq('coach_id', coach_id)
            .eq('status', 'active')
            .single();
        console.log("subscription", subscription)
        if (subError || !subscription) {
            return res.status(403).json({ error: "No active subscription found" });
        }

        // 2️⃣ Insert feedback
        const { data: feedback, error } = await supabase
            .from('coach_feedback')
            .insert([{
                user_id,
                coach_id,
                subscription_id,
                rating,
                review
            }])
            .select()
            .single();
        console.log("feedback", feedback)
        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: "Feedback already given for this subscription" });
            }
            throw error;
        }

        // 3️⃣ Update average rating
        await updateCoachRating(coach_id, rating);

        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully",
            data: feedback
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCoachFeedbacks = async (req, res) => {
    try {
        const { coach_id } = req.params;
        const { data, error } = await supabase
            .from('coach_feedback')
            .select('*, user:user_id(name, profile_image)')
            .eq('coach_id', coach_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const updateCoachRating = async (coach_id, newRating) => {
    const { data: coach } = await supabase
        .from('users')
        .select('avg_rating, total_reviews')
        .eq('id', coach_id)
        .single();

    const total = coach.total_reviews || 0;
    const avg = coach.avg_rating || 0;

    const newAvg = ((avg * total) + newRating) / (total + 1);

    await supabase
        .from('users')
        .update({
            avg_rating: newAvg.toFixed(1),
            total_reviews: total + 1
        })
        .eq('id', coach_id);
};