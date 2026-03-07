const supabase = require('../../config/supabase');
const dayjs = require("dayjs");

exports.addReminder = async (req, res) => {

    try {
        const morning = dayjs().hour(8).minute(0).second(0).toISOString();
        const afternoon = dayjs().hour(12).minute(0).second(0).toISOString();
        const evening = dayjs().hour(18).minute(0).second(0).toISOString();
        const { habit_id } = req.body;
        console.log("habit_id", habit_id);

        const { data: habit, error: habitError } = await supabase
            .from("habits")
            .select("*")
            .eq("id", habit_id)
            .single();
        console.log("jjjjjjj", habit)
        if (habitError) throw habitError;


        if (habit.is_morning) {
            const { data, error } = await supabase
                .from("habit_reminders")
                .insert([
                    {
                        habit_id,
                        reminder_datetime: morning,
                        day_frequency: "morning",
                        is_sent: false,
                    }
                ])
                .select()
                .single();
            console.log("ppppp", habit.is_morning)
            if (error) throw error;
        }
        if (habit.is_afternoon) {
            const { data, error } = await supabase
                .from("habit_reminders")
                .insert([
                    {
                        habit_id,
                        reminder_datetime: afternoon,
                        day_frequency: "afternoon",
                        is_sent: false,
                    }
                ])
                .select()
                .single();

            if (error) throw error;
        }
        if (habit.is_evening) {
            const { data, error } = await supabase
                .from("habit_reminders")
                .insert([
                    {
                        habit_id,
                        reminder_datetime: evening,
                        day_frequency: "evening",
                        is_sent: false,
                    }
                ])
                .select()
                .single();

            if (error) throw error;
        }

        res.status(201).json({
            success: true,
            message: "Reminder created",
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
        console.log("", data)
        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

};

// exports.deleteReminders = async (req, res) => {
//     try {
//         const { habit_id } = req.params;

//         const { error } = await supabase
//             .from("habit_reminders")
//             .delete()
//             .eq("habit_id", habit_id);

//         if (error) throw error;

//         res.json({
//             success: true,
//             message: "Reminders deleted"
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };