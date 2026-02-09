const supabase = require('./config/supabase');
const dotenv = require('dotenv');

// Ensure env vars are loaded (though supabase.js might do it, explicit is safer if run from root)
dotenv.config();

const fetchUsers = async () => {
    console.log('Fetching users...');

    const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .limit(5);

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No users found in the database. You may need to sign up a user first.');
    } else {
        console.log('\n--- AVAILABLE USERS ---');
        data.forEach(user => {
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`ID: ${user.id}`); // This is likely the UUID
            console.log('-----------------------');
        });
        console.log('\nUse these IDs in your Postman payload.');
    }
};

fetchUsers();
