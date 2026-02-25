const supabase = require('../../config/supabase');
const { generateToken } = require('../../config/agora');
const crypto = require('crypto');

exports.book = async (req, res) => {
    const user_id = req.user.id;
    const { coach_id, appointment_date, start_time } = req.body;

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user_id)
        .eq('coach_id', coach_id)
        .eq('status', 'active')
        .single();

    if (!sub) return res.status(400).json({ message: "No active subscription" });

    const { error } = await supabase
        .from('appointments')
        .insert([{
            user_id,
            coach_id,
            appointment_date,
            start_time,
            end_time: start_time,
            status: 'requested'
        }]);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: "Request sent to coach" });
};

exports.getRequests = async (req, res) => {
    const coach_id = req.user.id;
    console.log("coach_id", coach_id);

    const data = await supabase
        .from('appointments')
        .select('*')
        .eq('coach_id', coach_id)
        .eq('status', 'requested');

    res.json(data);
};


exports.myAppointments = async (req, res) => {
    const user_id = req.user.id;
    const { data, error } = await supabase
        .from('appointments')
        .select('*, coach:coach_id(id, name)')
        .eq('user_id', user_id);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
};

exports.getOne = async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('appointments')
        .select('*, coach:coach_id(id, name), user:user_id(id, name)')
        .eq('id', id)
        .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
};
exports.getCoachAppointments = async (req, res) => {
    const coach_id = req.user.id;

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            start_time,
            status,
            channel_name,
            agora_token,
            user:user_id (
                id,
                name,
                email
            )
        `)
        .eq('coach_id', coach_id)
        .order('appointment_date', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
};

exports.accept = async (req, res) => {
    const coach_id = req.user.id;
    const { id } = req.params;
    console.log("id", id);
    console.log("coach_id", coach_id);

    const channel = "appointment_" + crypto.randomBytes(4).toString('hex');
    const token = generateToken(channel);
    console.log("TOKEN:", token);

    const { data, error } = await supabase
        .from('appointments')
        .update({
            status: 'accepted',
            accepted_at: new Date(),
            channel_name: channel,
            agora_token: token
        })
        .eq('user_id', id)
        .eq('coach_id', coach_id)
        .select();
    console.log("data appointment", data);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, channel_name: channel, agora_token: token });
};

exports.reject = async (req, res) => {
    const coach_id = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
        .from('appointments')
        .update({
            status: 'rejected',
            rejected_reason: reason || null
        })
        .eq('id', id)
        .eq('coach_id', coach_id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: "Rejected" });
};

exports.cancel = async (req, res) => {
    const user_id = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', user_id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true });
};

exports.refreshAgoraToken = async (req, res) => {
    const { id } = req.params;
    const { data: appt } = await supabase
        .from('appointments')
        .select('channel_name')
        .eq('id', id)
        .single();

    if (!appt || !appt.channel_name) return res.status(400).json({ error: "Invalid appointment" });

    const token = generateToken(appt.channel_name);
    await supabase.from('appointments').update({ agora_token: token }).eq('id', id);

    res.json({ success: true, agora_token: token });
};