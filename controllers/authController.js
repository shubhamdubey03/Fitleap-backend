const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { updateReward } = require('./reward/rewardController');
const dayjs = require('dayjs');
const sendOtpEmail = require('../email/sendOtpEmail');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};
const crypto = require('crypto');

const generateReferralCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};
const getUniqueReferralCode = async () => {
    let code;
    let exists = true;

    while (exists) {
        code = generateReferralCode();

        const { data } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle();

        if (!data) exists = false;
    }

    return code;
};

// @desc    Register a new user (Standard Signup)
// @route   POST /api/auth/signup-user
// @access  Public
// const signupUser = async (req, res) => {
//     try {
//         const { name, email, password, mobile, countryCode, referralByCode, role } = req.body;

//         const normalizedRole = role?.trim().toLowerCase();

//         // Trim and Validate
//         const trimmedName = name?.trim();
//         const trimmedEmail = email?.trim().toLowerCase();
//         const trimmedPassword = password?.trim();
//         const trimmedMobile = mobile?.trim();
//         const trimmedCountryCode = countryCode?.trim();
//         const userRole = (normalizedRole === 'student' || normalizedRole === 'college student')
//             ? (normalizedRole === 'student' ? 'Student' : 'College Student')
//             : 'User';

//         if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedMobile || !trimmedCountryCode) {
//             return res.status(400).json({ message: 'Please add all fields, including countryCode' });
//         }

//         // Email Validation
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(trimmedEmail)) {
//             return res.status(400).json({ message: 'Please provide a valid email address' });
//         }

//         // Phone Validation (simple length check)
//         if (trimmedMobile.length < 10) {
//             return res.status(400).json({ message: 'Please provide a valid mobile number' });
//         }

//         // Password Validation
//         if (trimmedPassword.length < 8) {
//             return res.status(400).json({ message: 'Password must be at least 8 characters long' });
//         }

//         // Check if user exists
//         const { data: userExists, error: userExistsError } = await supabase
//             .from('users')
//             .select('email')
//             .eq('email', trimmedEmail)
//             .maybeSingle();

//         if (userExists) {
//             return res.status(400).json({ message: 'User already exists' });
//         }

//         const isEduEmail = trimmedEmail.endsWith('.edu');
//         const isGmailEmail = trimmedEmail.endsWith('@gmail.com') || trimmedEmail.endsWith('@gamil.com'); // Supporting the typo just in case, but gmail.com is primary
//         console.log("isEduEmail", isEduEmail);
//         console.log("isGmailEmail", isGmailEmail);

//         // Handle Student approval logic
//         let is_active = true;
//         if (userRole === 'Student' || userRole === 'College Student') {
//             is_active = false;
//         }

//         // Handle ID Card Upload
//         let id_proof_image = null;
//         if (req.file) {
//             const ext = req.file.originalname.split('.').pop();
//             const fileName = `student_ids/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

//             const { error: uploadError } = await supabase.storage
//                 .from('documents')
//                 .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

//             if (uploadError) {
//                 console.error('ID Upload Error:', uploadError);
//             } else {
//                 id_proof_image = supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl;
//             }
//         }

//         // Hash password
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(trimmedPassword, salt);
//         const referralCode = await getUniqueReferralCode();

//         // OTP Logic for .edu emails
//         let otp = null;
//         let otp_expiry = null;
//         if (isEduEmail) {
//             otp = Math.floor(100000 + Math.random() * 900000).toString();
//             otp_expiry = dayjs().add(10, 'minute').toISOString();
//         }
//         console.log("---------", isEduEmail)
//         // Create user
//         const { data: user, error: createError } = await supabase
//             .from('users')
//             .insert([
//                 {
//                     name: trimmedName,
//                     email: trimmedEmail,
//                     password: hashedPassword,
//                     phone: trimmedMobile,
//                     country_code: trimmedCountryCode,
//                     role: userRole,
//                     referral_code: referralCode,
//                     wallet_balance: 0,
//                     is_active: is_active,
//                     id_proof_image: id_proof_image,
//                     // otp: otp,
//                     // otp_expiry: otp_expiry,
//                     // email_verified: !isEduEmail, // Auto-verified if not .edu
//                 },
//             ])
//             .select()
//             .maybeSingle();
//         console.log("...........", user)
//         if (createError) {
//             console.error('Supabase Signup Error:', createError);
//             return res.status(400).json({ message: 'Invalid user data', error: createError.message });
//         }

//         // Send OTP email if needed (for .edu emails or specified flow)
//         if (otp) {
//             try {
//                 // Store OTP in user_tokens
//                 await supabase
//                     .from('user_tokens')
//                     .delete()
//                     .eq('user_id', user.id)
//                     .eq('token_type', 'email_verify');

//                 await supabase
//                     .from('user_tokens')
//                     .insert([{
//                         user_id: user.id,
//                         token: otp,
//                         token_type: 'email_verify',
//                         created_at: new Date().toISOString()
//                     }]);

//                 await sendOtpEmail(trimmedEmail, otp, trimmedName);
//             } catch (err) {
//                 console.error("Failed to send OTP email:", err);
//             }
//         }
//         console.log("-----------kkkkkkk", isEduEmail)
//         // updating user wallet
//         await updateReward(user.id, 'signup')

//         if (referralByCode) {
//             const { data: referrer } = await supabase
//                 .from('users')
//                 .select('*')
//                 .eq('referral_code', referralByCode)
//                 .maybeSingle();

//             if (referrer && referrer.id !== user.id) {
//                 // store referral record
//                 await supabase.from('referrals').insert([{
//                     referred_by: referrer.id,
//                     referred_to: user.id,
//                     coins: 10,
//                     status: 'completed'
//                 }]);
//                 const newBalance = referrer.wallet_balance + 10;
//                 await supabase
//                     .from('users')
//                     .update({ wallet_balance: newBalance })
//                     .eq('id', referrer.id);
//             }
//         }

//         if (user) {
//             // If .edu, need OTP first
//             if (isEduEmail) {
//                 return res.status(201).json({
//                     message: 'OTP sent to your .edu email. Please verify.',
//                     requireOtp: true,
//                     email: user.email,
//                 });
//             }

//             // If not approved, send a different response
//             if ((user.role === 'Student' || user.role === 'College Student') && !user.is_active) {
//                 return res.status(201).json({
//                     message: 'Signup successful! Wait for admin approval.',
//                     _id: user.id,
//                     name: user.name,
//                     email: user.email,
//                     role: user.role,
//                 });
//             }

//             res.status(201).json({
//                 _id: user.id,
//                 name: user.name,
//                 email: user.email,
//                 referral_code: user.referral_code,
//                 role: user.role,
//                 is_premium: user.is_premium || false,
//                 is_subscribed: user.is_subscribed || false,
//                 token: generateToken(user.id),
//             });
//         } else {
//             res.status(400).json({ message: 'Invalid user data' });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };
const signupUser = async (req, res) => {
    try {
        const { name, email, password, mobile, countryCode, referralByCode, role, email_verified } = req.body;

        const normalizedRole = role?.trim().toLowerCase();

        const trimmedName = name?.trim();
        const trimmedEmail = email?.trim().toLowerCase();
        const trimmedPassword = password?.trim();
        const trimmedMobile = mobile?.trim();
        const trimmedCountryCode = countryCode?.trim();

        const userRole =
            normalizedRole === "student"
                ? "Student"
                : normalizedRole === "college student"
                    ? "College Student"
                    : "User";

        if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedMobile || !trimmedCountryCode) {
            return res.status(400).json({ message: "Please add all fields, including countryCode" });
        }

        if (userRole === "User" && (email_verified !== "true" && email_verified !== true)) {
            return res.status(400).json({ message: "Please verify your email address before signing up." });
        }

        // Name validation: Only alphabets and spaces allowed
        const nameRegexValidation = /^[A-Za-z\s]+$/;
        if (!nameRegexValidation.test(trimmedName)) {
            return res.status(400).json({ message: "Name must only contain alphabets (no numbers or special characters allowed)" });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        if (!trimmedEmail.endsWith('@gmail.com') && !trimmedEmail.endsWith('.edu')) {
            return res.status(400).json({ message: "Only @gmail.com and .edu email addresses are allowed" });
        }

        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(trimmedMobile)) {
            return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
        }

        // Strong password regex: min 8 chars, 1 letter, 1 number, 1 special char
        const strongPasswordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongPasswordRegex.test(trimmedPassword)) {
            return res.status(400).json({ message: "Password must be at least 8 characters long and include alphabets, numbers, and special characters" });
        }

        // Check if user exists
        const { data: userExists } = await supabase
            .from("users")
            .select("email")
            .eq("email", trimmedEmail)
            .maybeSingle();

        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Email type check
        const isEduEmail = trimmedEmail.endsWith(".edu");

        // Student approval logic
        let is_active = true;

        if (userRole === "Student" || userRole === "College Student") {
            // Both cases require approval or verification
            is_active = false;
        }

        // Upload ID card
        let id_proof_image = null;

        if (req.file) {
            const ext = req.file.originalname.split(".").pop();
            const fileName = `student_ids/${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("documents")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                });

            if (!uploadError) {
                id_proof_image = supabase.storage
                    .from("documents")
                    .getPublicUrl(fileName).data.publicUrl;
            }
        }

        // Password hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

        const referralCode = await getUniqueReferralCode();

        // Create user
        const { data: user, error: createError } = await supabase
            .from("users")
            .insert([
                {
                    name: trimmedName,
                    email: trimmedEmail,
                    password: hashedPassword,
                    phone: trimmedMobile,
                    country_code: trimmedCountryCode,
                    role: userRole,
                    referral_code: referralCode,
                    wallet_balance: 0,
                    is_active: email_verified === "true" || email_verified === true ? true : is_active,
                    // email_verified: email_verified === "true" || email_verified === true,
                    id_proof_image,
                },
            ])
            .select()
            .maybeSingle();
        console.log("useraaaaaaaaaaaa", user);

        if (createError) {
            return res.status(400).json({
                message: "Invalid user data",
                error: createError.message,
            });
        }

        // Send OTP if EDU student and NOT VERIFIED
        // OTP for EDU
        let otp = null;

        if (isEduEmail && (userRole === "Student" || userRole === "College Student")) {
            otp = Math.floor(100000 + Math.random() * 900000).toString();
            await supabase
                .from("user_tokens")
                .delete()
                .eq("user_id", user.id)
                .eq("token_type", "email_otp");
            console.log("user.id", user.id);
            console.log("otp", isEduEmail);
            const { data: tokenInsert, error: tokenError } = await supabase.from("user_tokens").insert([
                {
                    user_id: user.id,
                    token: otp,
                    token_type: "email_otp",
                    created_at: new Date().toISOString(),
                },
            ]);
            console.log("tokenInsert", tokenInsert);
            console.log("tokenError", tokenError);
            console.log("OTP sent to", trimmedEmail);
            await sendOtpEmail(trimmedEmail, otp, trimmedName);
        }

        // Signup reward (Only for normal users; students get it upon admin approval or email verification)
        if (userRole === "User") {
            await updateReward(user.id, "signup");
        }

        // Referral logic
        if (referralByCode) {
            const { data: referrer } = await supabase
                .from("users")
                .select("*")
                .eq("referral_code", referralByCode)
                .maybeSingle();

            if (referrer && referrer.id !== user.id) {
                await supabase.from("referrals").insert([
                    {
                        referred_by: referrer.id,
                        referred_to: user.id,
                        coins: 10,
                        status: "completed",
                    },
                ]);

                await supabase
                    .from("users")
                    .update({
                        wallet_balance: referrer.wallet_balance + 10,
                    })
                    .eq("id", referrer.id);
            }
        }

        // Responses
        if (user) {
            // EDU student OTP
            if (
                (user.role === "Student" || user.role === "College Student") &&
                isEduEmail
            ) {
                return res.status(201).json({
                    message: "OTP sent to your .edu email. Please verify.",
                    requireOtp: true,
                    email: user.email,
                });
            }

            // Gmail student -> admin approval
            if (
                (user.role === "Student" || user.role === "College Student") &&
                !isEduEmail
            ) {
                return res.status(201).json({
                    message: "Signup successful! Waiting for admin approval.",
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                });
            }

            // Normal user
            return res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                referral_code: user.referral_code,
                role: user.role,
                is_premium: user.is_premium || false,
                is_subscribed: user.is_subscribed || false,
                token: generateToken(user.id),
            });
        }

        res.status(400).json({ message: "Invalid user data" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};
const tempOtps = new Map();

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const trimmedEmail = email?.trim().toLowerCase();

        if (!trimmedEmail || !otp) {
            return res.status(400).json({ message: "Email and OTP required" });
        }

        const currentTime = new Date().toISOString();

        const { data, error } = await supabase
            .from("email_otps")
            .select("*")
            .eq("email", trimmedEmail)
            .eq("otp", String(otp))
            .eq("is_verified", false)
            .gt("expires_at", currentTime)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!data) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // ✅ mark verified
        await supabase
            .from("email_otps")
            .update({ is_verified: true })
            .eq("id", data.id);

        // ✅ optional: user activate
        const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("email", trimmedEmail)
            .maybeSingle();

        if (user) {
            await supabase
                .from("users")
                .update({ is_active: true })
                .eq("id", user.id);

            return res.status(200).json({
                message: "OTP verified successfully",
                token: generateToken(user.id)
            });
        }

        return res.status(200).json({
            message: "OTP verified successfully"
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const trimmedEmail = email?.trim().toLowerCase();

        if (!trimmedEmail) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // ✅ delete old OTP
        const { error: deleteError } = await supabase
            .from("email_otps")
            .delete()
            .eq("email", trimmedEmail);

        if (deleteError) {
            console.error("Delete Error:", deleteError);
        }

        // ✅ insert new OTP
        const { error: insertError } = await supabase
            .from("email_otps")
            .insert([{
                email: trimmedEmail,
                otp: String(otp),
                expires_at: expiresAt.toISOString(),
                is_verified: false
            }]);

        if (insertError) {
            console.error("Insert Error:", insertError);
            return res.status(500).json({ error: insertError.message });
        }

        await sendOtpEmail(trimmedEmail, otp, 'User');

        return res.status(200).json({ message: "OTP sent successfully" });

    } catch (err) {
        console.error("Send OTP Error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

const verifyOtps = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const trimmedEmail = email?.trim().toLowerCase();
        console.log(trimmedEmail, otp);
        if (!trimmedEmail || !otp) {
            return res.status(400).json({ message: "Email and OTP required" });
        }


        // ✅ Step 1: find user
        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", trimmedEmail)
            .maybeSingle();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }


        // expires_at = now + 5 minutes
        const currentTime = new Date().toISOString();

        // 🔍 OTP check karo
        const { data, error } = await supabase
            .from("user_tokens")
            .select("*")
            .eq("user_id", user.id)
            .eq("token", otp)
            .eq("token_type", "email_verify")
            .single();
        console.log(data, error)

        if (error || !data) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // const createdTime = new Date(data.created_at).getTime();
        // const now = Date.now();

        // if (now - createdTime > 5 * 60 * 1000) {
        //     return res.status(400).json({ message: "OTP expired" });
        // }

        await supabase
            .from("user_tokens")
            .delete()
            .eq("id", data.id);

        // ✅ Step 5: activate user
        await supabase
            .from("users")
            .update({ is_active: true })
            .eq("id", user.id);

        return res.status(200).json({
            message: "OTP verified successfully"
        });

    } catch (err) {
        console.error("Verify OTP Error:", err);
        return res.status(500).json({ message: "Server error" });
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
            email_verified,
        } = req.body;

        // Trim and Validate
        const tName = name?.trim();
        const tEmail = email?.trim().toLowerCase();
        const tMobile = mobile?.trim();
        const tPassword = password?.trim();
        const tBankName = bankName?.trim();
        const tBankAccNo = bankAccNo?.trim();
        const tIfscCode = ifscCode?.trim();

        if (!tName || !tEmail || !tMobile || !tPassword || !countryCode || !tBankName || !tBankAccNo || !tIfscCode) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!req.files || !req.files.nutrition || !req.files.aadharCard || !req.files.panCard) {
            return res.status(400).json({ message: 'Nutrition certificate, Aadhar Card, and PAN Card are required' });
        }

        // Bank Name validation: Only alphabets and spaces allowed
        const bankNameRegex = /^[A-Za-z\s]+$/;
        if (!bankNameRegex.test(tBankName)) {
            return res.status(400).json({ message: 'Bank Name must only contain alphabets' });
        }

        // Name validation: Only alphabets and spaces allowed
        const nameRegexValidation = /^[A-Za-z\s]+$/;
        if (!nameRegexValidation.test(tName)) {
            return res.status(400).json({ message: 'Name must only contain alphabets (no numbers or special characters allowed)' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(tEmail)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        if (!tEmail.endsWith('@gmail.com') && !tEmail.endsWith('.edu')) {
            return res.status(400).json({ message: 'Only @gmail.com and .edu email addresses are allowed' });
        }

        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(tMobile)) {
            return res.status(400).json({ message: 'Mobile number must be exactly 10 digits' });
        }

        const strongPasswordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongPasswordRegex.test(tPassword)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include alphabets, numbers, and special characters' });
        }

        // Bank Account Number validation: 9 to 18 digits
        const bankAccNoRegex = /^\d{9,18}$/;
        if (!bankAccNoRegex.test(tBankAccNo)) {
            return res.status(400).json({ message: 'Bank Account Number must be between 9 and 18 digits' });
        }

        // IFSC Code validation: 4 letters, then 0, then 6 alphanumeric characters
        const ifscCodeRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscCodeRegex.test(tIfscCode)) {
            return res.status(400).json({ message: 'Invalid IFSC Code format (e.g., SBIN0123456)' });
        }

        // ✅ Safe email check (NO crash)
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', tEmail)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(tPassword, 10);

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
                name: tName,
                email: tEmail,
                password: hashedPassword,
                phone: tMobile,
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
                bank_name: tBankName,
                bank_acc_no: tBankAccNo,
                ifsc_code: tIfscCode,
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
        const trimmedEmail = email?.trim().toLowerCase();
        console.log(`Login attempt for: ${trimmedEmail}, Password Length: ${password?.length}`);

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', trimmedEmail)
            .maybeSingle();

        if (userError) {
            console.error('Supabase Login Error:', userError);
        }

        if (!user) {
            console.log(`Login failed: No user found with email ${trimmedEmail}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            console.log(`Login failed: Password mismatch for user ${trimmedEmail}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Handle optional ID Card Upload during login
        if (req.file && (user.role === 'Student' || user.role === 'College Student')) {
            const ext = req.file.originalname.split('.').pop();
            const fileName = `student_ids/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            console.log("file name", fileName);

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

            if (!uploadError) {
                const id_proof_image = supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl;
                await supabase.from('users').update({ id_proof_image }).eq('id', user.id);
            }
        }

        if (user.role === 'Coach') {
            const { data: coach, error: coachError } = await supabase
                .from('coaches')
                .select('is_approved')
                .eq('user_id', user.id)
                .maybeSingle();

            if (coachError || !coach) {
                return res.status(403).json({ message: 'Coach profile not found' });
            }

            if (coach.is_approved === false) {
                return res.status(403).json({ message: 'Your account is pending admin approval' });
            }
        }

        // Student Approval Logic
        if (user.role === 'Student' || user.role === 'College Student') {
            // Check for verification/activation
            if (!user.is_active && !trimmedEmail.endsWith('.edu')) {
                return res.status(403).json({ message: 'Your student account is pending admin approval' });
            }

            // The user wants students to get OTP on login (and .edu students bypass admin approval)
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Delete any existing verification tokens for this user
            await supabase
                .from('user_tokens')
                .delete()
                .eq('user_id', user.id)
                .eq('token_type', 'email_verify')

            // const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

            // Insert new token
            const { error: tokenError } = await supabase
                .from('user_tokens')
                .insert([{
                    user_id: user.id,
                    token: otp,
                    token_type: 'email_verify',
                    created_at: new Date().toISOString()
                }]);
            console.log(";;;;;;;", tokenError)
            if (tokenError) throw tokenError;

            try {
                await sendOtpEmail(trimmedEmail, otp, user.name);
            } catch (err) {
                console.error("Failed to send OTP email:", err);
            }

            return res.status(200).json({
                message: 'OTP sent to your email for login verification.',
                requireOtp: true,
                email: user.email
            });
        }

        console.log("Login Successful, generating token.");
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_premium: user.is_premium || false,
            is_subscribed: user.is_subscribed || false,
            subscription: user.is_subscribed || false,
            token: generateToken(user.id),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
console.log("SIGN SECRET:", process.env.JWT_SECRET);


// Helper to handle user retrieval or creation for Google Sign-In
const findOrCreateUser = async (name, email, picture) => {
    // 1. Optimize: Select only necessary fields
    let { data: user } = await supabase
        .from('users')
        .select('id, name, email, role, profile_image, is_subscribed')
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
        .select('id, name, email, role, profile_image')
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
        console.log("0000", payload)

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
// const googleLoginSimple = async (req, res) => {
//     try {
//         const { email, name } = req.body;

//         if (!email || !name) {
//             return res.status(400).json({ message: 'Email and Name are required' });
//         }

//         const user = await findOrCreateUser(name, email);
//         res.status(200).json({ ...user, token: generateToken(user.id) });

//     } catch (error) {
//         console.error("Google Simple Login Error:", error);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// @desc    Update User Profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const { name, phone, gender, age, height, weight, activity_level } = req.body;
        const userId = req.user.id; // Get ID from protected middleware

        if (!userId) {
            return res.status(400).json({ message: 'User not found in token' });
        }

        // Validation: Age and weight should not be negative
        if (age !== undefined && parseFloat(age) < 0) {
            return res.status(400).json({ message: 'Age cannot be negative' });
        }
        if (weight !== undefined && parseFloat(weight) < 0) {
            return res.status(400).json({ message: 'Weight cannot be negative' });
        }
        if (height !== undefined && parseFloat(height) < 0) {
            return res.status(400).json({ message: 'Height cannot be negative' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (gender !== undefined) updates.gender = gender;
        if (age !== undefined) updates.age = age;
        if (height !== undefined) updates.height = height;
        if (weight !== undefined) updates.weight = weight;
        if (activity_level !== undefined) updates.activity_level = activity_level;

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
        console.log("user", user)

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check for all active subscriptions and get coach details
        const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('id, end_date, coach_id, coach:coach_id(name)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gte('end_date', dayjs().format('YYYY-MM-DD'));

        const is_subscribed = subscriptions && subscriptions.length > 0;
        const subscribed_coach_ids = subscriptions ? subscriptions.map(s => s.coach_id).filter(Boolean) : [];

        // Always sync the actual status in the database
        await supabase
            .from('users')
            .update({ is_subscribed: is_subscribed })
            .eq('id', user.id);

        // Get unique coach names
        const coachNames = subscriptions
            ? [...new Set(subscriptions.map(s => s.coach?.name).filter(Boolean))].join(', ')
            : null;

        const userData = {
            ...user,
            _id: user.id, // For Redux compatibility
            is_premium: user.is_premium || is_subscribed,
            is_subscribed: is_subscribed, // Use the real-time result
            subscribed_coach_ids,
            subscription: is_subscribed,
            coach_name: coachNames || null
        };
        console.log("Profile Data with Coaches:", userData)
        res.status(200).json(userData);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Get users with pagination
// @route   GET /api/users
// @access  Private / Admin

const getUsers = async (req, res) => {
    try {

        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        // get users
        const { data: users, count, error } = await supabase
            .from("users")
            .select("*, orders(products(name))", { count: "exact" })
            .in('role', ['User', 'Student'])
            .range(start, end)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        res.status(200).json({
            page,
            limit,
            totalUsers: count,
            totalPages: Math.ceil(count / limit),
            users
        });

    } catch (error) {
        console.error("Pagination Error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.message
        });
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
    updateUserProfile,
    getUserProfile,
    updateProfileImage,
    verifyOtp,
    verifyOtps,
    sendOtp,
    getUsers,
};
