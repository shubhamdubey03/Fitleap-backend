const cron = require("node-cron");
const supabase = require("../../config/supabase");
const admin = require("../../config/firebase");
const dayjs = require("dayjs");

cron.schedule("30 * * * *", async () => {

    console.log("cron is running");

    try {

        const now = dayjs().toISOString();
        const today = dayjs().format("YYYY-MM-DD");
        console.log("now", now);
        const hour = dayjs().hour();
        console.log("hour", hour);

        const day_frequency = {
            6: "morning",
            12: "afternoon",
            18: "evening"
        }
        const todayStart = dayjs().startOf("day").toISOString();
        const todayEnd = dayjs().endOf("day").toISOString();

        const { data: reminders, error } = await supabase
            .from("habit_reminders")
            .select(`
                id,
                habit_id,
                reminder_datetime,
                habits (
                    habit_name,
                    frequency,
                    user_id,
                    is_morning,
                    is_afternoon,
                    is_evening,
                    users (
                        fcm_token,
                        name
                    )
                )
            `)
            .eq("day_frequency", day_frequency[hour])
            .gte("reminder_datetime", todayStart)
            .lte("reminder_datetime", todayEnd)
            .eq("is_enabled", true)
            .eq("is_sent", false);
        console.log("dataeeeeeeeee", reminders)
        console.log("error", error)
        if (error) throw error;

        if (!reminders || reminders.length === 0) return;

        for (const reminder of reminders) {

            const habit = reminder.habits;
            if (!habit) continue;

            const habitId = reminder.habit_id;
            const userId = habit.user_id;
            const habitName = habit.habit_name;
            const frequency = habit.frequency;
            const fcmToken = habit.users?.fcm_token;

            // check habit already completed today
            const { data: completed } = await supabase
                .from("habit_logs")
                .select("id")
                .eq("habit_id", habitId)
                .eq("completed_date", today)
                .maybeSingle();

            if (completed) {
                await supabase
                    .from("habit_reminders")
                    .update({ is_sent: true })
                    .eq("habit_id", habitId)
                    .eq("day_frequency", day_frequency[hour]);
            }

            const title = "Habit Reminder";
            const body = `Time to work on your habit: ${habitName}`;

            // save notification
            console.log("userId", userId);
            await supabase
                .from("notifications")
                .insert({
                    user_id: userId,
                    title,
                    body,
                    type: "broadcast",
                    data: { habit_id: habitId },
                    is_read: false
                });

            // send push notification
            if (fcmToken && admin.apps.length) {

                const message = {
                    token: fcmToken,
                    notification: {
                        title,
                        body
                    },
                    data: {
                        habit_id: String(habitId),
                        type: "broadcast"
                    }
                };

                try {
                    await admin.messaging().send(message);
                    console.log("Notification sent");
                } catch (err) {
                    console.log("FCM error:", err.message);
                }
            }

            // update next reminder
            let nextDate = dayjs(reminder.reminder_datetime);

            if (frequency === "daily") nextDate = nextDate.add(1, "day");
            else if (frequency === "weekly") nextDate = nextDate.add(1, "week");
            else if (frequency === "monthly") nextDate = nextDate.add(1, "month");
            else nextDate = nextDate.add(1, "day"); // Default to daily if frequency unknown

            await supabase
                .from("habit_reminders")
                .update({
                    is_sent: true,
                })
                .eq("id", reminder.id);

            if (habit.is_morning) {
                const { data, error } = await supabase
                    .from("habit_reminders")
                    .insert([
                        {
                            habit_id: habitId,
                            reminder_datetime: nextDate.toISOString(),
                            day_frequency: "morning",
                            is_sent: false,
                        }
                    ])
                    .select()
                    .single();

                if (error) throw error;
            }
            if (habit.is_afternoon) {
                const { data, error } = await supabase
                    .from("habit_reminders")
                    .insert([
                        {
                            habit_id: habitId,
                            reminder_datetime: nextDate.toISOString(),
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
                            habit_id: habitId,
                            reminder_datetime: nextDate.toISOString(),
                            day_frequency: "evening",
                            is_sent: false,
                        }
                    ])
                    .select()
                    .single();

                if (error) throw error;
            }

        }

    } catch (err) {
        console.error("Cron error:", err.message);
    }

});

// 🔥 TEST MODE: Runs every minute
// cron.schedule("0 8-22/2 * * *", async () => {
cron.schedule("* * * * *", async () => {
    console.log("⏰ [TEST] Running Water Intake Reminder Cron Job...");

    try {
        const { data: users, error } = await supabase
            .from("users")
            .select("id, fcm_token, name, water_reminder_enabled")
            .eq("water_reminder_enabled", true)
            .not("fcm_token", "is", null);

        if (error) throw error;

        if (!users || users.length === 0) {
            console.log("⚠️ No users found with water reminders ENABLED.");
            return;
        }

        console.log(`📡 Found ${users.length} users with water reminders enabled. Sending...`);

        const title = "💧 Hydration Time!";
        const body = "Time to drink some water and stay healthy!";

        for (const user of users) {
            // 1. Save notification to DB
            await supabase
                .from("notifications")
                .insert({
                    user_id: user.id,
                    title,
                    body,
                    type: "single",
                    is_read: false
                });

            // 2. Send Push Notification via FCM
            if (admin.apps.length && user.fcm_token) {
                const message = {
                    token: user.fcm_token,
                    notification: { title, body },
                    data: { type: "water_reminders" },
                    android: {
                        priority: "high",
                        notification: { channelId: "water-reminder" }
                    }
                };

                try {
                    await admin.messaging().send(message);
                } catch (fcmErr) {
                    console.log(`FCM Error for ${user.id}:`, fcmErr.message);
                }
            }
        }
        console.log(`✅ Successfully processed hydration reminders for ${users.length} users`);
    } catch (err) {
        console.error("Water Intake Cron Error:", err.message);
    }
});