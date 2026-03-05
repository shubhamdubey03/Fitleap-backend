const supabase = require('../../config/supabase');

exports.giveProductReview = async (req, res) => {
    try {
        console.log("request", req.params)
        const user_id = req.user.id;
        console.log("user_id", user_id)
        const { product_id } = req.params;
        const { order_id, rating, review } = req.body;
        console.log("order_id", order_id)
        console.log("rating", rating)
        console.log("review", review)
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // 1️⃣ Validate delivered order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .eq('user_id', user_id)
            .eq('product_id', product_id)
            .eq('delivery_status', 'delivered')
            .single();
        console.log("jjajsjsjs", order)
        if (orderError || !order) {
            return res.status(403).json({ error: "Product not eligible for review" });
        }

        // 2️⃣ Insert review
        const { data: reviewData, error } = await supabase
            .from('product_feedback')
            .insert([{
                user_id,
                product_id,
                order_id,
                rating,
                review
            }])
            .select()
            .single();
        console.log("reviewData", reviewData)
        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: "Review already submitted for this order" });
            }
            throw error;
        }

        // 3️⃣ Update product rating
        await updateProductRating(product_id, rating);

        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            data: reviewData
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const updateProductRating = async (product_id, newRating) => {
    const { data: product } = await supabase
        .from('products')
        .select('avg_rating, total_reviews')
        .eq('id', product_id)
        .single();

    const total = product.total_reviews || 0;
    const avg = product.avg_rating || 0;

    const newAvg = ((avg * total) + newRating) / (total + 1);

    await supabase
        .from('products')
        .update({
            avg_rating: newAvg.toFixed(1),
            total_reviews: total + 1
        })
        .eq('id', product_id);
};

exports.getProductReviews = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { data, error } = await supabase
            .from('product_reviews')
            .select('*, user:user_id(name, profile_image)')
            .eq('product_id', product_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};