require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = 'http://localhost:5000/api/chat';

async function testChat() {
    console.log('--- Starting Chat API Test ---');

    try {
        // 1. Get two users
        const { data: users, error } = await supabase.from('users').select('id, name').limit(2);

        if (error || users.length < 2) {
            console.error('❌ Need at least 2 users in the database to test chat.');
            return;
        }

        const user1 = users[0];
        const user2 = users[1];

        console.log(`User 1: ${user1.name} (${user1.id})`);
        console.log(`User 2: ${user2.name} (${user2.id})`);

        // 2. Send Message from User 1 to User 2
        const messageText = `Test message from script at ${new Date().toISOString()}`;
        console.log(`\n📤 Sending message: "${messageText}"`);

        const sendResponse = await axios.post(`${API_URL}/send`, {
            senderId: user1.id,
            receiverId: user2.id,
            message: messageText
        });

        if (sendResponse.status === 201) {
            console.log('✅ Message sent successfully');
        } else {
            console.error('❌ Failed to send message', sendResponse.data);
        }

        // 3. Get Conversation
        console.log('\n📥 Fetching conversation...');
        const getResponse = await axios.get(`${API_URL}/${user1.id}/${user2.id}`);

        const messages = getResponse.data;
        const found = messages.find(m => m.message === messageText);

        if (found) {
            console.log('✅ Verified: Message found in conversation history');
        } else {
            console.error('❌ Message NOT found in conversation history');
        }

        // 4. Get List of Conversations for User 1
        console.log('\n📋 Fetching conversation list for User 1...');
        const listResponse = await axios.get(`${API_URL}/conversations/${user1.id}`);
        const conversations = listResponse.data;

        const convoFound = conversations.find(c => c.userId === user2.id);
        if (convoFound) {
            console.log('✅ Verified: User 2 found in User 1\'s conversation list');
            console.log(`   Last Message: "${convoFound.lastMessage}"`);
        } else {
            console.error('❌ User 2 NOT found in conversation list');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('   Response Data:', error.response.data);
        }
    }
}

testChat();
