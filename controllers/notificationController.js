const supabase = require('../config/supabase');
const admin = require('../config/firebase');

// @desc    Save FCM Token and Send Personalized Notification
// @route   POST /api/notifications/save-token
// @access  Public
const saveTokenAndNotify = async (req, res) => {
    try {
        const { title, body, data, token, userId, water_reminder_enabled } = req.body;

        // 1. Update User with FCM Token and Preferences
        if (userId) {
            const updates = {};
            if (token) updates.fcm_token = token;
            if (water_reminder_enabled !== undefined) {
                updates.water_reminder_enabled = water_reminder_enabled;
            }

            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId);

            if (error) {
                console.error('Error saving preferences to Supabase:', error);
            } else {
                console.log(`✅ Preferences updated for user ${userId}`);
            }
        }

        if (!token) {
            // If no token, we just update preferences and return
            return res.status(200).json({ success: true, message: 'Preferences updated' });
        }

        if (!admin.apps.length) {
            return res.status(500).json({
                message: 'Firebase Admin not initialized.'
            });
        }

        // 2. Send Personalized Notification
        const message = {
            token: token,
            notification: {
                title: title || 'Default Title',
                body: body || 'Default Body',
            },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                }
            },
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent personalized message:', response);

        return res.status(200).json({
            success: true,
            message: 'Notification sent successfully',
            response
        });

    } catch (error) {
        console.error('Server Controller Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Send and Store Broadcast Notification to All Users
// @route   POST /api/notifications/broadcast
// @access  Private (Admin)
const sendBroadcastNotification = async (req, res) => {
    try {
        const { title, body, data } = req.body;

        if (!title || !body) {
            return res.status(400).json({ message: 'Title and Body are required for broadcast' });
        }

        // 1. Store in Database
        const { error: dbError } = await supabase
            .from('notifications')
            .insert([{
                title,
                body,
                type: 'broadcast',
                data: data || {},
                is_read: false
            }]);

        if (dbError) {
            console.error('Error saving broadcast notification to DB:', dbError);
        }

        // 2. Send Push Notification via FCM
        if (admin.apps.length) {
            const message = {
                topic: 'all_users',
                notification: { title, body },
                data: data || {},
                android: {
                    priority: 'high',
                    notification: { channelId: 'default' }
                },
            };
            await admin.messaging().send(message);
        }

        return res.status(200).json({
            success: true,
            message: 'Broadcast sent and stored successfully'
        });

    } catch (error) {
        console.error('Broadcast Error:', error);
        res.status(500).json({ message: 'Broadcast Failed', error: error.message });
    }
};

// @desc    Get Notifications for a User
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch broadcast notifications and targeted notifications for this user
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${userId},type.eq.broadcast`)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

// @desc    Mark Notification as Read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .or(`user_id.eq.${userId},type.eq.broadcast`);

        if (error) throw error;
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification', error: error.message });
    }
};
// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .or(`user_id.eq.${userId},type.eq.broadcast`);

        if (error) throw error;

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    saveTokenAndNotify,
    sendBroadcastNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead
};

