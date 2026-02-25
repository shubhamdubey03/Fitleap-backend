const supabase = require('../../config/supabase');

exports.setAvailability = async (req, res) => {
    const coach_id = req.user.id;
    const { day_of_week, start_time, end_time } = req.body;

    const { error } = await supabase
        .from('coach_availability')
        .insert([{ coach_id, day_of_week, start_time, end_time }]);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
};

exports.getSlots = async (req, res) => {
    const { coachId } = req.params;
    const date = req.query.date;
    const day = new Date(date).getDay();

    const { data: avail } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', coachId)
        .eq('day_of_week', day)
        .single();

    if (!avail) return res.json({ available_slots: [] });

    let slots = [];
    for (let h = parseInt(avail.start_time); h < parseInt(avail.end_time); h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
    }

    const { data: booked } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('coach_id', coachId)
        .eq('appointment_date', date);

    const taken = booked.map(b => b.start_time);

    res.json({ available_slots: slots.filter(s => !taken.includes(s)) });
};

exports.updateAvailability = async (req, res) => {
    const coach_id = req.user.id;
    const { id } = req.params;
    const { day_of_week, start_time, end_time } = req.body;

    const { error } = await supabase
        .from('coach_availability')
        .update({ day_of_week, start_time, end_time })
        .eq('id', id)
        .eq('coach_id', coach_id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
};

exports.deleteAvailability = async (req, res) => {
    const coach_id = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
        .from('coach_availability')
        .delete()
        .eq('id', id)
        .eq('coach_id', coach_id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
};

exports.getCoachAvailability = async (req, res) => {
    const { coachId } = req.params;
    const { data, error } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', coachId);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
};