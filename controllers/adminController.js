const supabase = require('../config/supabase');

// @desc    Get all Coaches
// @route   GET /api/admin/coaches
// @access  Private (Admin)
const getAllCoaches = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('coaches')
            .select(`
                *,
                users:user_id (name, email, phone)
            `); // Removed filter .eq('is_approved', true) since approval is removed

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Approve Coach
// @route   PUT /api/admin/approve-coach/:id
// @access  Private (Admin)
const approveCoach = async (req, res) => {
    try {
        const { id } = req.params; // coach table id

        // check exists
        const { data: coach } = await supabase
            .from('coaches')
            .select('id, is_approved')
            .eq('id', id)
            .maybeSingle();

        if (!coach) {
            return res.status(404).json({ message: 'Coach not found' });
        }

        if (coach.is_approved) {
            return res.json({ message: 'Coach already approved' });
        }

        // approve
        const { data, error } = await supabase
            .from('coaches')
            .update({ is_approved: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: 'Coach approved successfully',
            coach: data
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// @desc    Get all Registered USERS
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'User') // Filter: Only show standard users, not coaches/admins
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getAllCoaches, // Renamed from getApprovedCoach
    getAllUsers,
    approveCoach,
};
