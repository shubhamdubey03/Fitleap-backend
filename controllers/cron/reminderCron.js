const cron = require("node-cron");
const supabase = require("../../config/supabase");
const admin = require("../../config/firebase");
const dayjs = require("dayjs");

cron.schedule("* * * * *", async () => {

    console.log("cron is running");

    try {

        const now = dayjs().toISOString();
        const today = dayjs().format("YYYY-MM-DD");
        console.log("now", now);
        const hour = dayjs().hour();
        console.log("hour", hour);

        const day_frequency = {
            8: "morning",
            12: "afternoon",
            19: "evening"
        }

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
                .eq("id", reminder.id)
                .eq("day_frequency", day_frequency[hour]);

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