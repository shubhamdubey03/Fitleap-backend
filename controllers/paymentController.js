const { razorpay } = require('../config/razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { pdfGenerator } = require('../utils/pdfGenerator');
const { updateReward } = require('./reward/rewardController');

const createPaymentOrder = async (req, res) => {
    try {
        const { order_id, amount } = req.body;

        const razorOrder = await razorpay.orders.create({
            amount: amount * 100, // Amount in paise (multiply by 100)
            currency: "INR"
        });
        console.log("user_id", req.user);
        console.log("***************Razor Order:", razorOrder);

        const { error } = await supabase.from("payments").insert({
            user_id: req.user.id,
            order_id,
            razorpay_order_id: razorOrder.id,
            amount,
            status: "created"
        });

        if (error) throw error;

        await supabase.from("orders")
            .update({ status: "pending_payment" })
            .eq("id", order_id);

        // fetching order details
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", order_id)
            .single();

        if (orderError) throw orderError;

        // Return response with Razorpay ID taking precedence for the 'id' field
        res.json({
            ...order,
            ...razorOrder, // spread razorOrder LAST to ensure 'id' is the Razorpay Order ID (order_...)
            key: process.env.RAZORPAY_KEY
        });
    } catch (error) {
        console.error("Payment Creation Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// const createPaymentOrder = async (req, res) => {
//     try {
//         const user_id = req.user; // from auth middleware
//         const { amount, order_id } = req.body;
//         // order_id = your internal order UUID

//         if (!amount) {
//             return res.status(400).json({ error: "Amount required" });
//         }

//         // 1️⃣ Create Razorpay order
//         const razorpayOrder = await razorpay.orders.create({
//             amount: amount * 100, // convert to paise
//             currency: "INR",
//             receipt: order_id,
//         });

//         // 2️⃣ Save payment record in DB (pending)
//         const { error } = await supabase
//             .from("payments")
//             .insert({
//                 user_id,
//                 order_id,
//                 razorpay_order_id: razorpayOrder.id,
//                 razorpay_payment_id: null,
//                 amount,
//                 status: "created"
//             });

//         if (error) throw error;

//         // 3️⃣ Send Razorpay order to frontend
//         res.json({
//             razorpay_order_id: razorpayOrder.id,
//             amount: razorpayOrder.amount,
//             currency: razorpayOrder.currency,
//             key: process.env.RAZORPAY_KEY_ID
//         });

//     } catch (err) {
//         console.error("Create Payment Error:", err);
//         res.status(500).json({ error: err.message });
//     }
// };
const verifyPayment = async (req, res) => {
    try {
        console.log("Verify Payment Request:", req.body);
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment details" });
        }

        // 🔐 Generate expected signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        // ✅ Compare
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        // 📦 Update payment in DB
        await supabase
            .from("payments")
            .update({ status: "success" })
            .eq("razorpay_order_id", razorpay_order_id);

        await supabase
            .from("orders")
            .update({ status: "paid" })
            .eq("id", orderId);

        // fetching order details
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(`
                *,
                products: product_id(*)
            `)
            .eq("id", orderId)
            .single();

        if (!order.reward_given) {
            await updateReward(order.user_id, 'market', order.total_price);

            await supabase
                .from('orders')
                .update({ reward_given: true })
                .eq('id', order.id);
        }
        console.log("orderqqqqqqqqqqqqqq", order);

        const fileName = `invoice-${order.id}.pdf`;
        const filePath = require('path').join(__dirname, '../invoices', fileName);
        await pdfGenerator(order, filePath);

        console.log("File Path:", filePath);

        const invoiceUrl = `${req.protocol}://${req.get('host')}/invoices/${fileName}`;
        console.log("Invoice URL:", invoiceUrl);

        // ✅ Save invoice URL in orders table
        const { error: updateError } = await supabase
            .from("orders")
            .update({ invoice_url: invoiceUrl })
            .eq("id", order.id);

        if (updateError) {
            console.error("Invoice URL update failed:", updateError);
            throw updateError;
        }

        res.status(200).json({
            message: "Payment verified successfully",
            order: {
                ...order,
                invoice_url: invoiceUrl   // return updated value to frontend
            }
        });

    } catch (err) {
        console.error("Verify Payment Error:", err);
        res.status(500).json({ error: err.message });
    }
};



module.exports = { createPaymentOrder, verifyPayment };
