const supabase = require('../../config/supabase');

exports.addReminder = async (req, res) => {

    try {

        const { habit_id, reminder_datetime } = req.body;

        const { data, error } = await supabase
            .from("habit_reminders")
            .insert([
                {
                    habit_id,
                    reminder_datetime
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: "Reminder created",
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

};
exports.getReminders = async (req, res) => {

    try {

        const { habit_id } = req.params;

        const { data, error } = await supabase
            .from("habit_reminders")
            .select("*")
            .eq("habit_id", habit_id)
            .order("reminder_datetime");

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

};

exports.deleteReminders = async (req, res) => {
    try {
        const { habit_id } = req.params;

        const { error } = await supabase
            .from("habit_reminders")
            .delete()
            .eq("habit_id", habit_id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Reminders deleted"
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};