const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const sendVendorEmail = require('../email/sendVendorEmail');

function generateRandomPassword() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const createVendor = async (req, res) => {
    try {
        const {
            name,
            email,
            category,
            mobile,
            country_code,
            address1,
            city,
            pincode,
            address_type,
            state_id
        } = req.body;

        const cleanEmail = email.trim().toLowerCase();

        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();

        console.log("----", existingUser)

        if (existingUser) {
            return res.status(400).json({
                error: "Email already registered"
            });
        }

        // 1. Generate password
        const rawPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // 2. Create user with vendor role
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([{
                name,
                email: cleanEmail,
                phone: mobile,
                password: hashedPassword,
                role: 'vendor',
                country_code,
                category,
            }])
            .select()
            .single();

        if (userError) throw userError;

        // 4. Create address
        const { error: addressError } = await supabase
            .from('addresses')
            .insert([{
                user_id: user.id,
                name,
                mobile_number: mobile,
                address1,
                city,
                pincode,
                address_type,
                state_id
            }]);

        if (addressError) throw addressError;
        res.json({
            success: true,
            message: "Vendor created successfully",
            login_password: rawPassword
        });
        await sendVendorEmail("shubham.dubeyargos@gmail.com", rawPassword, name);


    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const getVendors = async (req, res) => {
    try {
        const { data: vendors, error } = await supabase
            .from('users')
            .select('id, name, email, phone, category')
            .eq('role', 'vendor')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(vendors);
    } catch (err) {
        console.error('Fetch vendors error:', err);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};

module.exports = { createVendor, getVendors };
