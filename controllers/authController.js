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
        if (!name || !email || !password || !mobile || !countryCode) {
            return res.status(400).json({ message: 'Please add all fields, including countryCode' });
        }

        // Check if user exists
        const { data: userExists, error: userExistsError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .maybeSingle();

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
                is_premium: user.is_premium || false,
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
        console.log('Signup Body:', req.body);
        console.log('Files:', req.files ? Object.keys(req.files) : 'No files');

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

        // ✅ Validation
        if (!name || !email || !mobile || !password || !countryCode || !bankName || !bankAccNo || !ifscCode) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // ✅ Safe email check (NO crash)
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 📤 Upload helper
        const uploadFile = async (file, folder) => {
            if (!file) return null;

            const ext = file.originalname.split('.').pop();
            const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            const { error } = await supabase.storage
                .from('documents')
                .upload(fileName, file.buffer, { contentType: file.mimetype });

            if (error) throw error;

            return supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl;
        };

        // 📎 Upload docs
        const nutritionUrl = req.files?.nutrition
            ? await uploadFile(req.files.nutrition[0], 'nutrition')
            : null;

        const aadharCardUrl = req.files?.aadharCard
            ? await uploadFile(req.files.aadharCard[0], 'identity')
            : null;

        const panCardUrl = req.files?.panCard
            ? await uploadFile(req.files.panCard[0], 'identity')
            : null;

        // 👤 Create user
        const { data: user, error: userErr } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                password: hashedPassword,
                phone: mobile,
                country_code: countryCode,
                role: 'Coach',
            }])
            .select()
            .single();
        console.log("User created successfulldddy", user);
        if (userErr) throw userErr;

        // 📋 Create coach profile (PENDING)
        const { error: coachErr } = await supabase
            .from('coaches')
            .insert([{
                user_id: user.id,
                bank_name: bankName,
                bank_acc_no: bankAccNo,
                ifsc_code: ifscCode,
                nutrition_url: nutritionUrl,
                aadhar_card_url: aadharCardUrl,
                pan_card_url: panCardUrl,
                is_approved: false,
            }]);

        if (coachErr) {
            // 🔁 rollback user if coach insert fails
            await supabase.from('users').delete().eq('id', user.id);
            throw coachErr;
        }

        // ✅ IMPORTANT: no token returned (Frontend expects redirect to Login)
        res.status(201).json({
            message: 'Application Submitted! Your account is awaiting Admin approval. You will be able to login once approved.',
            userId: user.id,
            email: user.email,
            role: user.role,
        });

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ message: err.message });
    }
};


// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.role === 'Coach') {

            const { data: coach, error: coachError } = await supabase
                .from('coaches')
                .select('is_approved')
                .eq('user_id', user.id)
                .maybeSingle();

            if (coachError || !coach) {
                return res.status(403).json({
                    message: 'Coach profile not found'
                });
            }

            if (coach.is_approved === false) {
                return res.status(403).json({
                    message: 'Your account is pending admin approval'
                });
            }
        }

        console.log("Login Successful, generating token.");
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_premium: user.is_premium || false,
            token: generateToken(user.id),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// Helper to handle user retrieval or creation for Google Sign-In
const findOrCreateUser = async (name, email, picture) => {
    // 1. Optimize: Select only necessary fields
    let { data: user } = await supabase
        .from('users')
        .select('id, name, email, role, profile_image, is_premium')
        .eq('email', email)
        .maybeSingle();

    if (user) {
        // Update profile picture if missing or update always to sync with Google
        if (picture && !user.profile_image) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_image: picture })
                .eq('id', user.id);

            if (!updateError) {
                user.profile_image = picture;
            }
        }
        return { ...user, isNewUser: false };
    }

    // 2. Create User if not found
    // Optimize: Use random password and random phone to avoid unique constraints if any
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const randomPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Random 10 digit

    const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
            name,
            email,
            password: randomPassword,
            role: 'User',
            phone: randomPhone,
            country_code: '+91',
            profile_image: picture // Save Google Profile Picture
        }])
        .select('id, name, email, role, profile_image, is_premium')
        .single();

    if (error) throw error;
    return { ...newUser, isNewUser: true };
};

// @desc    Google Login (ID Token)
// @route   POST /api/auth/google
// @access  Public
// const googleLogin = async (req, res) => {
//     try {
//         const { idToken } = req.body;
//         const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//         const ticket = await client.verifyIdToken({
//             idToken,
//             audience: process.env.GOOGLE_CLIENT_ID,
//         });

//         const { name, email } = ticket.getPayload();
//         const user = await findOrCreateUser(name, email);

//         res.status(200).json({ ...user, token: generateToken(user.id) });

//     } catch (error) {
//         console.error("Google Login Error:", error);
//         res.status(401).json({ message: `Google Authentication Failed: ${error.message}`, error: error.message });
//     }
// };

const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        console.log("📩 Google ID Token received");

        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        console.log("✅ Google Payload:", {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        });

        const { name, email } = payload;

        const user = await findOrCreateUser(name, email, payload.picture);

        console.log("👤 User from DB:", user);

        res.status(200).json({
            ...user,
            token: generateToken(user.id)
        });

    } catch (error) {
        console.error("❌ Google Login Error:", error.message);
        res.status(401).json({
            message: "Google Authentication Failed",
            error: error.message
        });
    }
};


// @desc    Google Login (Simple - Email & Name)
// @route   POST /api/auth/google-simple
// @access  Public
const googleLoginSimple = async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({ message: 'Email and Name are required' });
        }

        const user = await findOrCreateUser(name, email);
        res.status(200).json({ ...user, token: generateToken(user.id) });

    } catch (error) {
        console.error("Google Simple Login Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update User Profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const { name, phone, gender, age, bio, location, website } = req.body;
        const userId = req.user.id; // Get ID from protected middleware

        if (!userId) {
            return res.status(400).json({ message: 'User not found in token' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (gender !== undefined) updates.gender = gender;
        if (age !== undefined) updates.age = age;
        if (bio !== undefined) updates.bio = bio;
        if (location !== undefined) updates.location = location;
        if (website !== undefined) updates.website = website;

        // Handle File Upload (Profile Image)
        if (req.file) {
            const fileName = `${Date.now()}_${req.file.originalname}`;
            const { data, error } = await supabase.storage
                .from('profile_image') // Use correct bucket name
                .upload(`${userId}/${fileName}`, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (error) {
                console.error('Supabase Storage Error:', error);
                // Continue? Or error? Let's log but continue update metadata if possible,
                // or fail. Failing is safer.
                throw new Error('Image upload failed: ' + error.message);
            }

            const { data: publicData } = supabase.storage
                .from('profile_image')
                .getPublicUrl(`${userId}/${fileName}`);

            if (publicData) {
                updates.profile_image = publicData.publicUrl;
            }
        }

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Update Profile Error:', error);
            return res.status(400).json({ message: 'Update failed', error: error.message });
        }

        res.status(200).json(updatedUser);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get User Profile
// @route   GET /api/auth/profile
// @access  Private (Requires token)
const getUserProfile = async (req, res) => {
    try {
        const user = req.user; // Attached by protect middleware

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update Profile Image
// @route   PUT /api/auth/update-image
// @access  Private
const updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        const userId = req.user.id;
        const fileName = `${Date.now()}_${req.file.originalname}`;

        // DEBUGGING: List all buckets to check availability
        // const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        // if (buckets) {
        //     console.log('Available Buckets:', buckets.map(b => b.name));
        //     const bucketExists = buckets.find(b => b.name === 'profile_image');
        //     console.log("Does 'profile_image' bucket exist?", !!bucketExists);
        // } else {
        //     console.error('Error listing buckets:', bucketsError);
        // }

        // console.log(`Attempting upload to 'profile_image' for User: ${userId}, File: ${fileName}`);

        // ✅ Upload to correct Supabase bucket
        const { error: uploadError } = await supabase.storage
            .from('profile_image')
            .upload(`${userId}/${fileName}`, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            return res.status(400).json({ message: uploadError.message });
        }

        // ✅ Get public URL
        const { data: publicData } = supabase.storage
            .from('profile_image')
            .getPublicUrl(`${userId}/${fileName}`);

        const imageUrl = publicData.publicUrl;

        // ✅ Save in users table
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({ profile_image: imageUrl })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ message: error.message });
        }

        res.json({
            message: "Profile image updated",
            profile_image: imageUrl,
            user: updatedUser
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
    signupUser,
    signup,
    login,
    googleLogin,
    googleLoginSimple,
    updateUserProfile,
    getUserProfile,
    updateProfileImage,
};
