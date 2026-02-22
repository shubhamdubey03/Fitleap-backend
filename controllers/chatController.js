const supabase = require('../config/supabase');

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Protected
const sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, message } = req.body;

        if (!senderId || !receiverId || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check for Premium Status
        const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('role, is_premium')
            .eq('id', senderId)
            .single();

        if (senderError || !sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }

        // Only enforce premium for regular 'User' role
        if (sender.role === 'User' && !sender.is_premium) {
            return res.status(403).json({
                message: 'Premium subscription required to chat with coaches',
                requiresPremium: true
            });
        }

        const { data, error } = await supabase
            .from('messages')
            .insert([{ sender_id: senderId, receiver_id: receiverId, message }])
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            return res.status(500).json({ message: 'Failed to send message', error: error.message });
        }

        // Emit message to receiver via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(receiverId).emit('receive_message', data);
        }

        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get conversation between two users
// @route   GET /api/chat/:userId/:otherUserId
// @access  Protected
const getConversation = async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching conversation:', error);
            return res.status(500).json({ message: 'Failed to fetch conversation', error: error.message });
        }

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get list of active conversations for a user
// @route   GET /api/chat/conversations/:userId
// @access  Protected
const getConversations = async (req, res) => {
    try {
        const { userId } = req.params;

        // This is a bit complex in standard SQL/Supabase without a dedicated view.
        // For V1, we will fetch all messages for the user and process unique contacts in JS.
        // Ideally, create a Postgres View for this.

        const { data: sent, error: sentError } = await supabase
            .from('messages')
            .select('receiver_id, created_at, message, users:receiver_id(name)')
            .eq('sender_id', userId)
            .order('created_at', { ascending: false });

        const { data: received, error: receivedError } = await supabase
            .from('messages')
            .select('sender_id, created_at, message, users:sender_id(name)')
            .eq('receiver_id', userId)
            .order('created_at', { ascending: false });

        if (sentError || receivedError) {
            console.error('Error fetching conversations:', sentError || receivedError);
            return res.status(500).json({ message: 'Failed to fetch conversations' });
        }

        // Combine and find unique contacts
        const contacts = {};

        sent.forEach(msg => {
            if (!contacts[msg.receiver_id] || new Date(msg.created_at) > new Date(contacts[msg.receiver_id].lastMessageTime)) {
                contacts[msg.receiver_id] = {
                    userId: msg.receiver_id,
                    name: msg.users?.name || 'Unknown',
                    lastMessage: msg.message,
                    lastMessageTime: msg.created_at
                };
            }
        });

        received.forEach(msg => {
            if (!contacts[msg.sender_id] || new Date(msg.created_at) > new Date(contacts[msg.sender_id].lastMessageTime)) {
                contacts[msg.sender_id] = {
                    userId: msg.sender_id,
                    name: msg.users?.name || 'Unknown',
                    lastMessage: msg.message,
                    lastMessageTime: msg.created_at
                };
            }
        });

        const sortedConversations = Object.values(contacts).sort((a, b) =>
            new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );

        res.json(sortedConversations);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    sendMessage,
    getConversation,
    getConversations
};
