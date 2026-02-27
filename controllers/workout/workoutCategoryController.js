const supabase = require('../../config/supabase');

exports.createCategory = async (req, res) => {
    try {
        const { name, image } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Category name is required" });
        }

        const { data, error } = await supabase
            .from('workout_categories')
            .insert([
                {
                    name,
                    image: image || null
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            message: "Category created successfully",
            data
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getCategories = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('workout_categories')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({
            message: "Categories fetched successfully",
            data
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};