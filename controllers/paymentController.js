const { razorpay } = require('../config/razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { pdfGenerator } = require('../utils/pdfGenerator');
const { updateReward } = require('./reward/rewardController');

const createPaymentOrder = async (req, res) => {
    try {
        const { order_id, amount } = req.body;
        console.log("order_id", order_id);
        console.log("amount", amount);

        const razorOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Amount in paise (multiply by 100) and MUST be an integer
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
            if (orderId) {
                await supabase.from("orders").delete().eq("id", orderId);
                await supabase.from("payments").delete().eq("order_id", orderId);
            }
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

        console.log("************************Payment Signature Verified************************");

        // 📦 Update payment record status
        await supabase
            .from("payments")
            .update({ status: "success" })
            .eq("razorpay_order_id", razorpay_order_id);

        const { data: payment } = await supabase
            .from("payments")
            .select("*")
            .eq("razorpay_order_id", razorpay_order_id)
            .single();

        // const items = payment.items;

        // // 4️⃣ Order create
        // const ordersData = items.map(item => ({
        //     user_id: payment.user_id,
        //     product_id: item.product_id,
        //     quantity: item.quantity,
        //     unit_price: item.price,
        //     price: item.price * item.quantity,
        //     wallet_used: payment.wallet_used,
        //     total_price: payment.amount,
        //     status: "paid",
        //     address_id: payment.address_id,
        // }));

        // const { error: insertError } = await supabase
        //     .from("orders")
        //     .insert(ordersData);

        // if (insertError) throw insertError;

        // 🪙 WALLET DEDUCTION LOGIC
        // We fetch the order to see if 'use_coins' was intented
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(
                `wallet_used, 
                price, 
                user_id, 
                id, 
                total_price, 
                reward_given, 
                product_id, 
                products (id, name, price,gst_percent, description)`)
            .eq("id", orderId)
            .single();

        if (orderError) throw orderError;

        if (order && order.wallet_used) {
            const { data: user } = await supabase
                .from("users")
                .select("wallet_balance")
                .eq("id", order.user_id)
                .single();

            if (user) {
                // Perform the 25% calculation based on balance CURRENTLY
                // const cartTotal = order.price;
                // const maxCoinUsage = parseFloat((user.wallet_balance * 0.25).toFixed(2));
                // const walletToDeduct = Math.min(maxCoinUsage, cartTotal);

                // if (walletToDeduct > 0) {
                //     const newBalance = Math.max(0, parseFloat((user.wallet_balance - walletToDeduct).toFixed(2)));

                const toBeAddedTotalPrice = user.wallet_balance + (order.total_price * 0.05);
                console.log("toBeAddedTotalPrice", toBeAddedTotalPrice);

                const finalUserWallet = toBeAddedTotalPrice - order.wallet_used;
                console.log("finalUserWallet", finalUserWallet);

                // 1. Deduct from User Wallet
                await supabase
                    .from("users")
                    .update({ wallet_balance: finalUserWallet })
                    .eq("id", order.user_id);

                // 2. Update Order Record with the applied discount
                await supabase
                    .from("orders")
                    .update({
                        status: "paid"
                    })
                    .eq("id", orderId);



                console.log(`[PAYMENT VERIFIED] Deducted ${order.wallet_used} coins. Order ${orderId} marked as paid.`);
            } else {
                await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
            }
        }
        // } else {
        //     // If coins were not used, just mark as paid
        //     await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
        // }

        // if (order && !order.reward_given) {
        //     // 💰 5% CASHBACK REWARD: Calculate and add to wallet
        //     const rewardAmount = parseFloat((order.total_price * 0.05).toFixed(2));

        //     const { data: userForReward } = await supabase
        //         .from("users")
        //         .select("wallet_balance")
        //         .eq("id", order.user_id)
        //         .single();

        //     if (userForReward) {
        //         const finalBalance = parseFloat((userForReward.wallet_balance + rewardAmount).toFixed(2));
        //         await supabase
        //             .from("users")
        //             .update({ wallet_balance: finalBalance })
        //             .eq("id", order.user_id);

        //         console.log(`[REWARD] 5% Cashback added: ${rewardAmount} coins to User: ${order.user_id}`);
        //     }

        //     // Existing reward logic if any
        //     await updateReward(order.user_id, 'market', order.total_price);

        //     await supabase
        //         .from('orders')
        //         .update({ reward_given: true })
        //         .eq('id', order.id);
        // }
        // console.log("orderqqqqqqqqqqqqqq", order);

        const fileName = `invoice-${order.id}.pdf`;
        const filePath = require('path').join(__dirname, '../invoices', fileName);
        // await pdfGenerator(order, filePath);
        // const invoiceUrl = `${req.protocol}://${req.get('host')}/invoices/${fileName}`;
        const invoiceUrl = await pdfGenerator(order);

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
