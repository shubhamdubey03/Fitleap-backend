const supabase = require('../../config/supabase');
const dayjs = require('dayjs');

exports.subscribe = async (req, res) => {
    const { coach_id, months } = req.body;
    const user_id = req.user.id;

    const start = dayjs().format('YYYY-MM-DD');
    const end = dayjs().add(months, 'month').format('YYYY-MM-DD');

    const { error } = await supabase
        .from('subscriptions')
        .insert([{ user_id, coach_id, start_date: start, end_date: end }]);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, start_date: start, end_date: end });
};

exports.mySubscriptions = async (req, res) => {
    const user_id = req.user.id;
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, coach:coach_id(id, name)')
        .eq('user_id', user_id);

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