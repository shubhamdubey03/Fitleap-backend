const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user (Standard Signup)
// @route   POST /api/auth/signup-user
// @access  Public
const signupUser = async (req, res) => {
    try {
        const { name, email, password, mobile, countryCode } = req.body;

        // Validation
        if (!name || !email || !password || !mobile) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if user exists
        const { data: userExists, error: userExistsError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const { data: user, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    email,
                    password: hashedPassword,
                    phone: mobile,
                    country_code: countryCode,
                    role: 'User',
                },
            ])
            .select()
            .single();

        if (createError) {
            console.error('Supabase Signup Error:', createError);
            return res.status(400).json({ message: 'Invalid user data', error: createError.message });
        }

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
    }
};

// @desc    Register a new coach/vendor
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    try {
        console.log('Signup Request Body:', req.body);
        console.log('Signup Request Files:', req.files ? Object.keys(req.files) : 'No files');

        const {
            name,
            email,
            mobile,
            password,
            countryCode,
            bankName,
            bankAccNo,
            ifscCode,
        } = req.body;

        // Validation
        if (!name || !email || !mobile || !password || !countryCode || !bankName || !bankAccNo || !ifscCode) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        // Check if user exists
        const { data: userExists, error: userExistsError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Handle File Uploads
        const uploadFile = async (file, path) => {
            if (!file) return null;
            const fileName = `${Date.now()}_${file.originalname}`;
            const { data, error } = await supabase.storage
                .from('documents') // Ensure this bucket exists
                .upload(`${path}/${fileName}`, file.buffer, {
                    contentType: file.mimetype,
                });
            if (error) throw error;
            return supabase.storage.from('documents').getPublicUrl(`${path}/${fileName}`).data.publicUrl;
        };

        let nutritionUrl = null;
        let aadharCardUrl = null;
        let panCardUrl = null;

        if (req.files) {
            if (req.files.nutrition) nutritionUrl = await uploadFile(req.files.nutrition[0], 'nutrition');
            if (req.files.aadharCard) aadharCardUrl = await uploadFile(req.files.aadharCard[0], 'identity');
            if (req.files.panCard) panCardUrl = await uploadFile(req.files.panCard[0], 'identity');
        }

        // Create user (Auth)
        const { data: user, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    email,
                    password: hashedPassword,
                    phone: mobile,
                    country_code: countryCode,
                    role: 'Coach',
                },
            ])
            .select()
            .single();

        if (createError) {
            console.error('Supabase Signup Error (User):', createError);
            return res.status(400).json({ message: 'Invalid user data', error: createError.message });
        }

        if (user) {
            // Create Coach Profile
            const { error: coachError } = await supabase
                .from('coaches')
                .insert([
                    {
                        user_id: user.id,
                        bank_name: bankName,
                        bank_acc_no: bankAccNo,
                        ifsc_code: ifscCode,
                        nutrition_url: nutritionUrl,
                        aadhar_card_url: aadharCardUrl,
                        pan_card_url: panCardUrl,
                        is_approved: false // Pending by default
                    }
                ]);

            if (coachError) {
                console.error('Supabase Signup Error (Coach):', coachError);
                // Optional: Delete user if coach profile fails to maintain consistency
                await supabase.from('users').delete().eq('id', user.id);
                return res.status(400).json({ message: 'Failed to create coach profile', error: coachError.message });
            }

            // For Coaches, DO NOT return token. Return pending message.
            res.status(201).json({
                message: 'Application submitted successfully. Please wait for Admin approval to login.',
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                // No token
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (user && (await bcrypt.compare(password, user.password))) {

            // Check Approval for Coaches
            if (user.role === 'Coach') {
                const { data: coachData, error: coachError } = await supabase
                    .from('coaches')
                    .select('is_approved')
                    .eq('user_id', user.id)
                    .single();

                if (coachError || !coachData) {
                    return res.status(403).json({ message: 'Coach profile not found or error fetching status.' });
                }

                if (!coachData.is_approved) {
                    return res.status(403).json({ message: 'Your account is pending approval. Please contact Admin.' });
                }
            }

            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        console.log('Using Google Client ID:', process.env.GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();

        // Check if user exists
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            // Create new user if not exists
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    name,
                    email,
                    password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password
                    role: 'User', // Default role for Google Login
                    // profile_pic: picture // Add if schema supports it
                }])
                .select()
                .single();

            if (createError) throw createError;
            user = newUser;
        }

        res.status(200).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
        });

    } catch (error) {
        console.error("Google Login Error:", error);
        res.status(401).json({ message: 'Google Authentication Failed', error: error.message });
    }
};

module.exports = {
    signupUser,
    signup,
    login,
    googleLogin,
};
