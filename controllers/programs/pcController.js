const supabase = require("../../config/supabase");
const { razorpay } = require("../../config/razorpay");
const crypto = require("crypto");


exports.createPC = async (req, res) => {
    try {
        const { title, description, type, duration_days, reward_coins, is_free } = req.body;
        const userId = req.user.id;

        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admin can create program/challenge" });
        }

        if (duration_days < 0 || reward_coins < 0) {
            return res.status(400).json({ error: "duration_days and reward_coins cannot be negative" });
        }

        const { data, error } = await supabase
            .from("programs_challenges")
            .insert({
                title,
                description,
                type,
                duration_days,
                reward_coins,
                is_free,
                created_by: userId
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: "Program/Challenge created",
            data
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProgramsChallenges = async (req, res) => {
    try {
        const userId = req.user.id;

        // User requested: check users table pc_subscription true
        const { data: userSubStatus } = await supabase
            .from("users")
            .select("pc_subscription")
            .eq("id", userId)
            .single();

        let query = supabase.from("programs_challenges").select("*");

        // Admins should see all. Users only see free ones if they don't have a subscription.
        if (req.user.role !== 'admin') {
            if (!userSubStatus || !userSubStatus.pc_subscription) {
                query = query.eq("is_free", true);
            }
        }

        const { data: programs, error } = await query;

        if (error) throw error;

        // Fetch Enrollments for current user
        const { data: enrollments } = await supabase
            .from("user_pc_enrollments")
            .select("*")
            .eq("user_id", userId);


        const programsWithLock = programs.map(p => ({
            ...p,
            is_locked: !p.is_free && !(userSubStatus && userSubStatus.pc_subscription)
        }));

        res.json({
            subscription: !!(userSubStatus && userSubStatus.pc_subscription),
            programs: programsWithLock
        });


    } catch (err) {
        res.status(500).json({ error: err.message });
    }

};

exports.subscribePC = async (req, res) => {

    try {

        const userId = req.user.id;
        console.log("----", userId)
        console.log("----", req.user)

        // ✅ Only users can subscribe
        if (req.user.role !== "User") {
            return res.status(403).json({
                message: "Only users can activate subscription"
            });
        }

        const { data: existing } = await supabase
            .from("pc_subscriptions")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

        if (existing) {
            return res.json({
                message: "Subscription already active"
            });
        }

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const { data, error } = await supabase
            .from("pc_subscriptions")
            .insert({
                user_id: userId,
                start_date: new Date(),
                end_date: endDate,
                status: "active"
            })
            .select()
            .single();


        if (error) throw error;

        res.json({
            message: "Subscription activated",
            data
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }

};


exports.createSubscriptionOrder = async (req, res) => {
    try {
        const { plan_id } = req.body;

        if (!plan_id) {
            return res.status(400).json({ error: "plan_id is required" });
        }

        const userId = req.user.id;

        // 1️⃣ Get Plan
        const { data: plan, error: planError } = await supabase
            .from("pc_subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .single();

        if (planError || !plan) {
            return res.status(404).json({ error: "Plan not found" });
        }

        // 🔥 3️⃣ Cleanup old pending orders (IMPORTANT)
        await supabase
            .from("pc_subscriptions")
            .delete()
            .eq("id", plan_id)
            .in("payment_status", ["pending", "cancelled"]);

        // 4️⃣ Create new Razorpay order (ALWAYS NEW)
        const options = {
            amount: Math.round(plan.price * 100),
            currency: "INR",
            receipt: `pc_subscription_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        console.log("-----", order)
        // 5️⃣ Insert fresh pending record
        const { error: subError } = await supabase
            .from("pc_subscriptions")
            .insert({
                user_id: userId,
                id: plan.id,
                razorpay_order_id: order.id,
                payment_status: "pending",
                amount: plan.price
            });
        console.log("========", subError)
        if (subError) {
            console.error("Subscription insert failed:", subError);
            return res.status(500).json({
                error: "Failed to create subscription record"
            });
        }

        // 6️⃣ Response
        return res.json({
            message: "Order created successfully",
            order,
            key: process.env.RAZORPAY_KEY,
            plan
        });

    } catch (error) {
        console.error("Create Order Error:", error);

        return res.status(500).json({
            error: "Order creation failed",
            details: error.message
        });
    }
};


exports.verifySubscriptionPayment = async (req, res) => {

    try {

        const userId = req.user.id;

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan_id
        } = req.body;
        console.log("req.body", req.body);

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");
        console.log("expectedSignature", expectedSignature);
        console.log("razorpay_signature", razorpay_signature);
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                message: "Payment verification failed"
            });
        }

        const { data: plan } = await supabase
            .from("pc_subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .single();



        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (plan.days || 30));

        const { data, error } = await supabase
            .from("pc_subscriptions")
            .update({
                status: "active",
                start_date: new Date(),
                end_date: endDate,
                razorpay_payment_id,
                razorpay_signature
            })
            .eq("razorpay_order_id", razorpay_order_id)
            .select()
            .single();

        if (error) throw error;


        // User requested: after payment verify then update in users table pc_subscription true
        await supabase
            .from("users")
            .update({ pc_subscription: true })
            .eq("id", userId);

        res.json({
            message: "Subscription activated",
            data
        });


    } catch (err) {
        res.status(500).json({ error: err.message });
    }

};
exports.enrollPC = async (req, res) => {

    try {

        const userId = req.user.id;
        const { pc_id } = req.body;

        const { data: existing } = await supabase
            .from("user_pc_enrollments")
            .select("*")
            .eq("user_id", userId)
            .eq("pc_id", pc_id)
            .maybeSingle();

        if (existing) {
            return res.json({ message: "Already enrolled" });
        }

        const { data, error } = await supabase
            .from("user_pc_enrollments")
            .insert({
                user_id: userId,
                pc_id
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: "Enrolled successfully",
            data
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }

};
exports.completePC = async (req, res) => {

    try {

        const userId = req.user.id;
        const { pc_id } = req.body;

        // check program
        const { data: pcData, error: pcError } = await supabase
            .from("programs_challenges")
            .select("reward_coins")
            .eq("id", pc_id)
            .single();

        if (pcError) throw pcError;

        // update enrollment
        const { error: progressError } = await supabase
            .from("user_pc_enrollments")
            .update({
                status: "completed",
                completed_at: new Date()
            })
            .eq("user_id", userId)
            .eq("pc_id", pc_id);

        if (progressError) throw progressError;

        // add coins
        if (pcData.reward_coins > 0) {

            const { data: userData } = await supabase
                .from("users")
                .select("wallet_balance")
                .eq("id", userId)
                .single();

            const newWallet = (userData.wallet_balance || 0) + pcData.reward_coins;

            await supabase
                .from("users")
                .update({ wallet_balance: newWallet })
                .eq("id", userId);
        }

        res.json({
            message: "Completed successfully",
            reward: pcData.reward_coins
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }

};