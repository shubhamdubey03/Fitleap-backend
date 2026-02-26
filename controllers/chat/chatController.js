const supabase = require("../../config/supabase");

exports.createOrGetChat = async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;
        const otherParticipantId = req.body.coach_id; // This is the ID passed from frontend

        // Determine who is the Student and who is the Coach
        let student_id, coach_id;

        if (loggedInUserRole === 'Coach') {
            coach_id = loggedInUserId;
            student_id = otherParticipantId;
        } else {
            student_id = loggedInUserId;
            coach_id = otherParticipantId;
        }

        console.log(`Chat Init: Student(${student_id}) <-> Coach(${coach_id})`);

        // 1️⃣ Check Active Subscription (Only if it's a User/Coach relationship)
        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", student_id)
            .eq("coach_id", coach_id)
            .eq("status", "active")
            .gte("end_date", new Date().toISOString())
            .maybeSingle();

        if (subError) throw subError;

        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: "No active subscription found between these participants"
            });
        }

        // 2️⃣ Sync User Status
        await supabase
            .from("users")
            .update({ is_subscribed: true })
            .eq("id", student_id);

        // 3️⃣ Check Existing Chat
        let { data: chat } = await supabase
            .from("chats")
            .select("*")
            .eq("user_id", student_id)
            .eq("coach_id", coach_id)
            .maybeSingle();

        if (chat) {
            return res.json({ success: true, data: chat });
        }

        // 4️⃣ Create Chat
        const { data: newChat, error } = await supabase
            .from("chats")
            .insert([{ user_id: student_id, coach_id: coach_id }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, data: newChat });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // Query chats where user is participant
        let query = supabase.from("chats").select(`
            *,
            user:users!chats_user_id_fkey(id, name, profile_image),
            coach:users!chats_coach_id_fkey(id, name, profile_image)
        `);

        if (role === 'Coach') {
            query = query.eq("coach_id", userId);
        } else {
            query = query.eq("user_id", userId);
        }

        const { data: chats, error } = await query;
        if (error) throw error;

        // Fetch last message for each chat
        const chatsWithLastMessage = await Promise.all(
            chats.map(async (chat) => {
                const { data: lastMsg } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("chat_id", chat.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const otherUser = role === 'Coach' ? chat.user : chat.coach;

                return {
                    chat_id: chat.id,
                    other_user: otherUser,
                    last_message: lastMsg,
                };
            })
        );

        // Sort by last message time
        chatsWithLastMessage.sort((a, b) => {
            const timeA = a.last_message ? new Date(a.last_message.created_at) : new Date(0);
            const timeB = b.last_message ? new Date(b.last_message.created_at) : new Date(0);
            return timeB - timeA;
        });

        res.json({ success: true, data: chatsWithLastMessage });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};