const supabase = require('../config/supabase');

// const createOrder = async (req, res) => {
//     try {
//         const user_id = req.user.id;
//         const { items, total_amount } = req.body;

//         // Create order with pending_payment status
//         // const amountInPaise = total_amount * 100;
//         const { data: order, error: orderError } = await supabase
//             .from("orders")
//             .insert({
//                 user_id,
//                 total_amount,
//                 status: "pending_payment",
//             })
//             .select()
//             .single();

//         if (orderError) throw orderError;
//         console.log("orderwwwwwwww", order);


//         // Insert order items as PENDING part of the order
//         const orderItems = items.map(i => ({
//             order_id: order.id,
//             product_id: i.product_id,
//             quantity: i.quantity,
//             price: i.price
//         }));

//         const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

//         if (itemsError) throw itemsError;

//         // Return order ID so frontend can initiate payment
//         res.json({ ...order, items: orderItems });
//     } catch (error) {
//         console.error("Order Creation Error:", error);
//         res.status(500).json({ error: error.message });
//     }
// };


const createOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        console.log("user_id", user_id);
        const { items, address_id } = req.body;
        console.log("kakakak", req.body)
        const ordersData = items.map(item => {
            const price = item.price * item.quantity;
            const tax = price * 0.05;
            const total_price = price + tax;

            return {
                user_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price,
                price,
                tax,
                total_price,
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

        console.log("response", data);

        res.status(201).json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
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

module.exports = { createOrder, updateOrderStatus, createProduct, productDetails, getProducts, deleteProduct, saveAddress, getAddress, getUserOrders, getAddresses, deleteAddress, updateAddress };
