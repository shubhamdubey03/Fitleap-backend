const supabase = require("../../config/supabase");

exports.sendMessage = async (req, res) => {
    try {
        const { chat_id, message } = req.body;
        const sender_id = req.user.id;
        const role = req.user.role;

        // 1️⃣ If User, check for active subscription
        if (role === 'User') {
            const { data: chat } = await supabase
                .from("chats")
                .select("coach_id")
                .eq("id", chat_id)
                .single();

            if (chat) {
                const { data: sub } = await supabase
                    .from("subscriptions")
                    .select("id")
                    .eq("user_id", sender_id)
                    .eq("coach_id", chat.coach_id)
                    .eq("status", "active")
                    .gte("end_date", new Date().toISOString())
                    .maybeSingle();

                if (!sub) {
                    return res.status(403).json({
                        success: false,
                        message: "Active subscription required to send messages"
                    });
                }

                // Sync status in users table
                await supabase
                    .from("users")
                    .update({ is_subscribed: true })
                    .eq("id", sender_id);
            }
        }

        const { data, error } = await supabase
            .from("messages")
            .insert([{ chat_id, sender_id, message }])
            .select()
            .single();

        if (error) throw error;

        // 2️⃣ Emit to Socket.io for Real-time
        const io = req.app.get('io');
        if (io) {
            io.to(chat_id).emit("new_message", data);
            console.log(`Message emitted to room: ${chat_id}`);
        }

        res.status(201).json({ success: true, data });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const offset = (page - 1) * limit;

        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({ success: true, data });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { chat_id } = req.body;
        const user_id = req.user.id;

        const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("chat_id", chat_id)
            .neq("sender_id", user_id);

        if (error) throw error;

        res.json({ success: true, message: "Messages marked as read" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};