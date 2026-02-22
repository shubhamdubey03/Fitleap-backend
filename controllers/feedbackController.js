const supabase = require('../config/supabase');

const addFeedback = async (req, res) => {
    const { user_id, product_id, order_id, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
            error: "Rating must be between 1 and 5"
        });
    }

    if (!comment) {
        return res.status(400).json({
            error: "Comment is required"
        });
    }

    const { data, error } = await supabase
        .from('feedbacks')
        .insert([
            { user_id, product_id, order_id, rating, comment }
        ]).select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Feedback added successfully", data });
};

const getProductFeedbacks = async (req, res) => {
    const { productId } = req.params;

    const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
};


const getUserFeedbacks = async (req, res) => {
    const { userId } = req.params;

    const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
};

module.exports = { addFeedback, getProductFeedbacks, getUserFeedbacks };



