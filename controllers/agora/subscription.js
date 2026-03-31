const supabase = require('../../config/supabase');
const dayjs = require('dayjs');
const { razorpay } = require('../../config/razorpay');
const crypto = require('crypto');

exports.subscribe = async (req, res) => {
    try {
        console.log("req.body", req.body)
        const { coach_id, months, amount, plan_id } = req.body; // coach_id can be null if it's a general platform sub
        const user_id = req.user.id;
        console.log("user_id", user_id)

        if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });
        if (!months || months <= 0) return res.status(400).json({ error: "Duration (months) must be greater than 0" });

        let finalPlanId = plan_id || 'Monthly';

        // 1. Insert into coach_plans ONLY if there is a coach_id
        if (coach_id) {
            const { data: planData, error: planError } = await supabase
                .from('coach_plans')
                .insert([{
                    coach_id,
                    plan_name: plan_id || 'Monthly',
                    price: amount,
                    duration_days: months * 30,
                    features: []
                }])
                .select()
                .single();

            if (planError) throw planError;
            finalPlanId = planData.id;
        }

        // 2. Create Razorpay order
        const razorOrder = await razorpay.orders.create({
            amount: amount * 100, // paise
            currency: "INR",
            receipt: `sub_${Date.now()}`
        });

        const start = dayjs().format('YYYY-MM-DD');
        const end = dayjs().add(months, 'month').format('YYYY-MM-DD');
        console.log("0000000000", razorOrder)
        // 3. Insert into subscriptions
        const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .insert([{
                user_id,
                coach_id,
                start_date: start,
                end_date: end,
                plan_price: amount,
                status: 'pending',
                payment_status: 'pending',
                razorpay_order_id: razorOrder.id,
                plan_id: finalPlanId
            }])
            .select()
            .single();
        console.log("kkkkkkkkkkkkkk", subData)
        if (subError) throw subError;

        res.json({
            success: true,
            order: razorOrder,
            subscription_id: subData.id,
            key: process.env.RAZORPAY_KEY
        });
    } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            subscription_id
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        // Activate the subscription
        const { data: sub, error: updateErr } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                payment_status: 'paid',
                razorpay_payment_id
            })
            .eq('id', subscription_id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // Update user's premium status
        await supabase
            .from('users')
            .update({ is_premium: true, is_subscribed: true })
            .eq('id', sub.user_id);

        res.json({ success: true, message: "Subscription activated!", data: sub });
    } catch (error) {
        console.error("Verify Subscription Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.mySubscriptions = async (req, res) => {
    const user_id = req.user.id;
    console.log("user_id", user_id)
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, coach:coach_id(id, name,profile_image)')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
    console.log("datassssssssss", data);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
};

exports.cancel = async (req, res) => {
    const user_id = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', user_id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
};
// GET all plans of a coach
exports.getCoachPlans = async (req, res) => {
    const { coachId } = req.params;
    console.log("coachId", coachId)

    const { data, error } = await supabase
        .from('coach_plans')
        .select('*')
        .eq('coach_id', coachId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, data });
};

// Platform Plans Management (Admin)
exports.createPlan = async (req, res) => {
    try {
        const { plan_name, price, duration_days, features, coach_id } = req.body;

        if (price < 0 || duration_days < 0) {
            return res.status(400).json({ success: false, error: "Price and duration_days cannot be negative" });
        }

        const { data, error } = await supabase
            .from('coach_plans')
            .insert([{ plan_name, price, duration_days, features, coach_id }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPlans = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('coach_plans')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_name, price, duration_days, features, coach_id } = req.body;

        if (price !== undefined && price < 0) {
            return res.status(400).json({ success: false, error: "Price cannot be negative" });
        }
        if (duration_days !== undefined && duration_days < 0) {
            return res.status(400).json({ success: false, error: "duration_days cannot be negative" });
        }

        const { data, error } = await supabase
            .from('coach_plans')
            .update({ plan_name, price, duration_days, features, coach_id })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('coach_plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};