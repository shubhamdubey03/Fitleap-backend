const supabase = require('../config/supabase');

const getStates = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('states')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('Get states error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { getStates };