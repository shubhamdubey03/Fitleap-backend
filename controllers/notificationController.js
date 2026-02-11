const supabase = require('../config/supabase');
const admin = require('../config/firebase');

// @desc    Save FCM Token and Send Personalized Notification
// @route   POST /api/notifications/save-token
// @access  Public
const saveTokenAndNotify = async (req, res) => {
    try {
        const { title, body, data, token, userId } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        console.log(`Received token: ${token}`);

        // 1. Update User with FCM Token (Optional if userId is provided)
        if (userId) {
            const { error } = await supabase
                .from('users')
                .update({ fcm_token: token })
                .eq('id', userId);

            if (error) {
                console.error('Error saving token to Supabase:', error);
            } else {
                console.log(`✅ Token saved to DB for user ${userId}`);
            }
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

// @desc    Send Broadcast Notification to All Users
// @route   POST /api/notifications/broadcast
// @access  Public (Should be Admin only in prod)
const sendBroadcastNotification = async (req, res) => {
    try {
        const { title, body, data } = req.body;

        if (!title || !body) {
            return res.status(400).json({ message: 'Title and Body are required for broadcast' });
        }

        console.log(`Broadcasting: ${title}`);

        if (!admin.apps.length) {
            return res.status(500).json({ message: 'Firebase Admin not initialized.' });
        }

        const message = {
            topic: 'all_users', // The topic name we subscribed to on frontend
            notification: {
                title: title,
                body: body,
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
        console.log('Successfully sent broadcast message:', response);

        return res.status(200).json({
            success: true,
            message: 'Broadcast sent successfully',
            response
        });

    } catch (error) {
        console.error('Broadcast Error:', error);
        res.status(500).json({ message: 'Broadcast Failed', error: error.message });
    }
};

module.exports = {
    saveTokenAndNotify,
    sendBroadcastNotification
};
