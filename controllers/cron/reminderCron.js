const cron = require("node-cron");
const supabase = require("../../config/supabase");
const admin = require("../../config/firebase");
const dayjs = require("dayjs");

cron.schedule("* * * * *", async () => {
    console.log("cron is running")
    try {
        const now = dayjs().toISOString();

        const { data, error } = await supabase
            .from("habit_reminders")
            .select(`
                id,
                habit_id,
                reminder_datetime,
                habits (
                    habit_name,
                    frequency,
                    user_id,
                    users (
                        fcm_token,
                        name
                    )
                )
            `)
            .lte("reminder_datetime", now)
            .eq("is_sent", true)
            .eq("is_enabled", true);
        console.log("iiiiii", error)
        console.log(";;;;;;", data)
        if (error) throw error;

        if (data && data.length > 0) {
            for (const reminder of data) {

                const habit = reminder.habits;
                if (!habit) continue;

                const user = habit.users;
                const habitName = habit.habit_name;
                const frequency = habit.frequency;
                const userId = habit.user_id;
                const fcmToken = user?.fcm_token;

                const title = "Habit Reminder";
                const body = `Time to work on your habit: ${habitName}`;

                console.log(`Reminder triggered for ${habitName}`);

                // Save notification in DB
                await supabase
                    .from("notifications")
                    .insert([{
                        user_id: userId,
                        title,
                        body,
                        type: "reminder",
                        data: { habit_id: reminder.habit_id },
                        is_read: false
                    }]);

                // Send push notification
                if (fcmToken && admin.apps.length) {

                    const message = {
                        token: fcmToken,

                        // Shows notification in BACKGROUND + QUIT
                        notification: {
                            title: title,
                            body: body
                        },

                        // Used for FOREGROUND handling
                        data: {
                            habit_id: String(reminder.habit_id),
                            type: "reminder",
                            title: title,
                            body: body
                        },

                        android: {
                            priority: "high",
                            notification: {
                                channelId: "default",
                                sound: "default", priority: "max",
                                visibility: "public"
                            }
                        },

                        apns: {
                            payload: {
                                aps: {
                                    sound: "default"
                                }
                            }
                        }
                    };

                    try {
                        await admin.messaging().send(message);
                        console.log(`✅ Notification sent to user ${userId}`);
                    } catch (err) {
                        console.log("FCM error:", err.message);
                    }
                }

                // Handle recurrence
                if (frequency === "daily" || frequency === "weekly" || frequency === "monthly") {

                    let nextDate = dayjs(reminder.reminder_datetime);

                    if (frequency === "daily") nextDate = nextDate.add(1, "day");
                    if (frequency === "weekly") nextDate = nextDate.add(1, "week");
                    if (frequency === "monthly") nextDate = nextDate.add(1, "month");

                    await supabase
                        .from("habit_reminders")
                        .update({ reminder_datetime: nextDate.toISOString() })
                        .eq("id", reminder.id);

                } else {

                    await supabase
                        .from("habit_reminders")
                        .update({ is_sent: true })
                        .eq("id", reminder.id);

                }
            }
        }

    } catch (err) {
        console.error("Cron error:", err.message);
    }
});