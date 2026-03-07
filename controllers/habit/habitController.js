const supabase = require('../../config/supabase');
const reminderController = require('./reminderController');


exports.createHabit = async (req, res) => {
    try {

        const user_id = req.user.id;
        const { habit_name, frequency, is_morning, is_afternoon, is_evening } = req.body;

        console.log(req.body);

        if (!habit_name || !frequency) {
            return res.status(400).json({
                success: false,
                message: "habit_name and frequency are required"
            });
        }

        const { data, error } = await supabase
            .from('habits')
            .insert([{ user_id, habit_name, frequency, is_morning, is_afternoon, is_evening }])
            .select()
            .single();

        if (error) throw error;

        req.body.habit_id = data.id;

        console.log("datawwwwwwwwwwwwwwwwwwwww", data)
        await reminderController.addReminder(req, res);

        // res.status(201).json({
        //     success: true,
        //     message: "Habit created successfully",
        //     data
        // });


    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

};


exports.getHabits = async (req, res) => {
    try {

        const user_id = req.user.id;

        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getSingleHabit = async (req, res) => {
    try {

        const { id } = req.params;

        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.updateHabit = async (req, res) => {
    try {

        const { id } = req.params;
        const { habit_name, frequency, is_morning, is_afternoon, is_evening } = req.body;

        const { data, error } = await supabase
            .from('habits')
            .update({ habit_name, frequency, is_morning, is_afternoon, is_evening })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Habit updated",
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.deleteHabit = async (req, res) => {
    try {

        const { id } = req.params;

        // Delete associated reminders first
        await supabase
            .from('habit_reminders')
            .delete()
            .eq('habit_id', id);

        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Habit deleted"
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.updateHabitStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabase
            .from('habits')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Status updated",
            data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};