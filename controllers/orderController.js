const supabase = require('../config/supabase');


const createOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        console.log("user_id", user_id);
        const { items, address_id, use_coins } = req.body;
        console.log("Request Body:", req.body);


        // 1️⃣ Calculate cart total
        let cartTotal = 0;

        items.forEach(item => {
            const price = item.price * item.quantity;
            // Removed 5% tax addition here to match frontend totals
            cartTotal += price;
        });

        // 2️⃣ Get user wallet
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("wallet_balance")
            .eq("id", user_id)
            .single();

        if (userError) throw userError;

        const userWallet = user.wallet_balance || 0;
        console.log("userWallet", userWallet);

        // 3️⃣ Apply 25% rule if toggled
        // Logic: Pay using up to 25% of your TOTAL WALLET BALANCE, capped by the cart total
        const maxCoinUsageAllowed = parseFloat((userWallet * 0.25).toFixed(2));
        const walletUsed = use_coins ? Math.min(maxCoinUsageAllowed, cartTotal) : 0;
        const finalPayable = parseFloat((cartTotal - walletUsed).toFixed(2));

        console.log(`--- Order Coin Calculation ---`);
        console.log(`Cart Total: ₹${cartTotal}`);
        console.log(`User Wallet: ${userWallet} coins`);
        console.log(`Max Usage Allowed (25% of wallet): ${maxCoinUsageAllowed}`);
        console.log(`Actually Used: ${walletUsed} coins`);
        console.log(`Final Payable: ₹${finalPayable}`);
        console.log(`------------------------------`);
        const ordersData = items.map(item => {
            const price = item.price * item.quantity;
            const tax = 0; // Tax already included in price
            const total_price = price;

            return {
                user_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price,
                price,
                tax,
                wallet_used: walletUsed / items.length, // optional split
                total_price: total_price - (walletUsed / items.length),
                status: "pending",
                address_id
            };
        });
        console.log("ordersData", ordersData);
        const { data, error } = await supabase
            .from("orders")
            .insert(ordersData)
            .select();

        if (error) throw error;
        if (walletUsed > 0) {
            const finalWallet = parseFloat((userWallet - walletUsed).toFixed(2));
            console.log("finalWallet", finalWallet);
            console.log("Wallet Used", walletUsed);
            await supabase
                .from("users")
                .update({ wallet_balance: finalWallet })
                .eq("id", user_id);
        }

        // 5️⃣ Send Final Response
        // This is the ONLY response that should be sent in this function
        return res.status(201).json({
            orders: data,
            cartTotal,
            walletUsed,
            finalPayable
        });

    } catch (err) {
        console.error("Create Order Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { order_id, status } = req.body;

        const { error } = await supabase.from("orders")
            .update({ status })
            .eq("id", order_id);

        if (error) throw error;

        res.json({ message: "Order updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;
        let image_url = req.body.image_url;

        // Handle File Upload
        if (req.file) {
            const fileName = `product_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('product_images') // Ensure this bucket exists in Supabase
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

            const { data: publicData } = supabase.storage
                .from('product_images')
                .getPublicUrl(fileName);

            image_url = publicData.publicUrl;
        }

        const { data, error } = await supabase
            .from("products")
            .insert({ name, description, price, stock, image_url, category })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, category } = req.body;
        let image_url = req.body.image_url;

        // Handle File Upload (Optional update)
        if (req.file) {
            const fileName = `product_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('product_images')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

            const { data: publicData } = supabase.storage
                .from('product_images')
                .getPublicUrl(fileName);

            image_url = publicData.publicUrl;
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (stock !== undefined) updates.stock = stock;
        if (category !== undefined) updates.category = category;
        if (image_url !== undefined) updates.image_url = image_url;

        const { data, error } = await supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const productDetails = async (req, res) => {
    console.log("------>")
    const { productId } = req.params;

    // Validate
    if (!productId) {
        return res.status(400).json({ error: "Product ID required" });
    }

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    if (!data) {
        return res.status(404).json({ error: "Product not found" });
    }

    res.json(data);
};

const getProducts = async (req, res) => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- Address Management ---
const saveAddress = async (req, res) => {
    try {
        const user_id = req.user.id;

        const {
            id, // Optional: if provided, update this address
            name,
            address1,
            address2,
            city,
            pincode,
            state_id,
            address_type,
            mobile_number
        } = req.body;

        // Validation logic
        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return res.status(400).json({ error: "Name must only contain letters and spaces." });
        }
        if (!/^[0-9]{10}$/.test(mobile_number)) {
            return res.status(400).json({ error: "Mobile number must be exactly 10 digits." });
        }
        if (!/^[0-9]{6}$/.test(pincode)) {
            return res.status(400).json({ error: "Pincode must be exactly 6 digits." });
        }

        let result;

        if (id) {
            // 🔄 UPDATE specific address
            const { data, error } = await supabase
                .from("addresses")
                .update({
                    name,
                    address1,
                    address2,
                    city,
                    pincode,
                    state_id,
                    address_type,
                    mobile_number
                })
                .eq("id", id)
                .eq("user_id", user_id) // Ensure ownership
                .select()
                .single();

            if (error) throw error;
            result = data;

        } else {
            // ➕ INSERT new address
            const { data, error } = await supabase
                .from("addresses")
                .insert({
                    user_id,
                    name,
                    address1,
                    address2,
                    city,
                    pincode,
                    state_id,
                    address_type: address_type || "home",
                    mobile_number
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        res.json(result);

    } catch (e) {
        console.error("Save Address Error:", e);
        res.status(500).json({ error: e.message });
    }
};

const getAddresses = async (req, res) => {
    try {
        console.log("req.user", req.user)
        const userId = req.user.id;
        console.log(userId)
        const { data, error } = await supabase
            .from("addresses")
            .select(`
        *,
        states (
          id,
          name
        )
      `)// Fetch state details if useful
            .eq("user_id", userId);

        console.log("pppp", data)

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAddress = async (req, res) => {
    try {
        const { userId } = req.params;
        // Return the most recently created or updated, or just one
        const { data, error } = await supabase.from("addresses").select("*").eq("user_id", userId).limit(1).single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json(data || null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("kkkkkk", req.params)
        const { error } = await supabase.from("addresses").delete().eq("id", id);
        if (error) throw error;
        res.json({ message: "Address deleted successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address1, address2, city, pincode, state_id, address_type, mobile_number } = req.body;

        // Validation logic
        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return res.status(400).json({ error: "Name must only contain letters and spaces." });
        }
        if (!/^[0-9]{10}$/.test(mobile_number)) {
            return res.status(400).json({ error: "Mobile number must be exactly 10 digits." });
        }
        if (!/^[0-9]{6}$/.test(pincode)) {
            return res.status(400).json({ error: "Pincode must be exactly 6 digits." });
        }

        const { error } = await supabase.from("addresses").update({ name, address1, address2, city, pincode, state_id, address_type, mobile_number }).eq("id", id);
        if (error) throw error;
        res.json({ message: "Address updated successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("userId", userId)

        const { data, error } = await supabase
            .from("orders")
            .select(`
                id,
                quantity,
                unit_price,
                price,
                tax,
                total_price,
                status,
                delivery_status,
                created_at,
                invoice_url,

                products (
                id,
                name,
                price,
                image_url
                ),

                payments (
                status,
                payment_method,
                amount
                ),
                addresses (
                id,
                name,
                mobile_number,
                address1,
                address2,
                city,
                pincode,
                address_type,

                states (
                id,
                name
                )
            )
           `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("orders")
            .select(`
                id,
                quantity,
                unit_price,
                price,
                tax,
                total_price,
                status,
                delivery_status,
                created_at,
                invoice_url,
                user_id,
                products (
                    id,
                    name,
                    price,
                    image_url
                ),
                users:user_id (
                    id,
                    name,
                    email,
                    phone
                ),
                payments (
                    status,
                    payment_method,
                    amount
                ),
                addresses (
                    id,
                    name,
                    mobile_number,
                    address1,
                    address2,
                    city,
                    pincode,
                    address_type,
                    states (
                        id,
                        name
                    )
                )
           `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const allowedStatuses = [
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled"
];

const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { delivery_status } = req.body;

        // 1️⃣ Validate status
        if (!allowedStatuses.includes(delivery_status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid delivery status"
            });
        }

        // 2️⃣ Check order exists
        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", id)
            .single();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // 3️⃣ Update status
        const { data, error } = await supabase
            .from("orders")
            .update({
                delivery_status,
                updated_at: new Date()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Delivery status updated successfully",
            data
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = { createOrder, updateOrderStatus, updateDeliveryStatus, createProduct, updateProduct, productDetails, getProducts, deleteProduct, saveAddress, getAddress, getUserOrders, getAddresses, deleteAddress, updateAddress, getAllOrders };
