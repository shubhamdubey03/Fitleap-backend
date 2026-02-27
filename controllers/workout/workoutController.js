// controllers/workoutController.js

const supabase = require('../../config/supabase');

exports.createWorkout = async (req, res) => {
    try {
        const { name, coin, time, category_id } = req.body;

        if (!name || !coin || !time) {
            return res.status(400).json({
                error: "Name, coin and time are required"
            });
        }

        const { data, error } = await supabase
            .from('workouts')
            .insert([
                {
                    name: name.trim(),
                    coin: Number(coin),
                    time: Number(time),
                    workout_category_id: category_id
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json({
            message: "Workout created successfully",
            data
        });

    } catch (err) {
        console.error("Create Workout Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.getAllWorkouts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({
            count: data.length,
            data
        });

    } catch (err) {
        console.error("Get Workouts Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.updateWorkoutTracker = async (req, res) => {
    try {
        const workout_id = req.params.workout_id?.trim();
        const { status, coins } = req.body;
        const user_id = req.user.id;
        const user = req.user;

        console.log("Full Body received:", req.body);
        console.log("Cleaned workout_id:", workout_id);

        if (!workout_id || !status) {
            return res.status(400).json({ error: "Workout ID and status required" });
        }

        // // 1️⃣ Check workout exists
        // const { data: workout, error: workoutError } = await supabase
        //     .from('workouts')
        //     .select('*')
        //     .eq('id', workout_id)
        //     .single();

        // if (workoutError || !workout) {
        //     return res.status(404).json({ error: "Workout not found" });
        // }

        // 2️⃣ Insert into user_workout_tracker
        const { error: trackerError } = await supabase
            .from('user_workout_tracker')
            .insert([
                {
                    user_id,
                    workout_id,
                    status,
                    coins: coins,
                    completed_at: new Date()
                }
            ]);
        console.log("anananhshshshshhsh", coins)
        if (trackerError) {
            return res.status(400).json({ error: trackerError.message });
        }

        // 3️⃣ If completed → update user stats
        if (status === "completed") {

            // 👉 Example: increment completed_workouts count
            newBalance = user.wallet_balance + coins
            console.log("newBalance", newBalance)
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    wallet_balance: newBalance
                })
                .eq('id', user_id);
            console.log("updateError", updateError)
            // console.log("updateError", wallet_balance)

            if (updateError) {
                return res.status(400).json({ error: updateError.message });
            }
        }

        return res.status(200).json({
            message: "Workout tracker updated successfully"
        });

    } catch (error) {
        console.error("Update Workout Tracker Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.getWorkoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ error: "Workout not found" });
        }

        return res.status(200).json({ data });
    } catch (err) {
        console.error("Get Workout By ID Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.deleteWorkout = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('workouts')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ message: "Workout deleted successfully" });
    } catch (err) {
        console.error("Delete Workout Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};