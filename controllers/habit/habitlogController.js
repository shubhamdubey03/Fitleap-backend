const supabase = require('../../config/supabase');




exports.completeHabit = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { habit_id } = req.body;

        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("habit_logs")
            .insert([
                {
                    habit_id,
                    user_id,
                    completed_date: today,
                    status: "completed"
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Habit marked completed",
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

};
exports.getHabitStreak = async (req, res) => {

    try {

        const { habit_id } = req.params;

        const { data, error } = await supabase
            .from("habit_logs")
            .select("completed_date")
            .eq("habit_id", habit_id)
            .order("completed_date", { ascending: false });

        if (error) throw error;

        let streak = 0;
        let today = new Date();

        for (let i = 0; i < data.length; i++) {

            const logDate = new Date(data[i].completed_date);
            const diff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));

            if (diff === streak) {
                streak++;
            } else {
                break;
            }

        }

        res.json({
            success: true,
            streak
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

};