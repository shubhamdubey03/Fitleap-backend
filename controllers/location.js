const supabase = require('../config/supabase');

const getCountries = async (req, res) => {
    const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};
const getStatesByCountry = async (req, res) => {
    const { countryId } = req.params;

    if (!countryId) {
        return res.status(400).json({ error: "Country ID required" });
    }

    const { data, error } = await supabase
        .from('states')
        .select('id, name')
        .eq('country_id', countryId)
        .order('name', { ascending: true });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};


module.exports = { getCountries, getStatesByCountry };
