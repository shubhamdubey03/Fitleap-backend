const supabase = require('../config/supabase');

// @desc    Get all PENDING coaches
// @route   GET /api/admin/pending-coaches
// @access  Private (Admin)
const getPendingCoaches = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('coaches')
            .select(`
                *,
                users:user_id (name, email, phone)
            `)
            .eq('is_approved', false);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Approve a coach
// @route   PUT /api/admin/approve-coach/:id
// @access  Private (Admin)
const approveCoach = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to approve coach with ID: ${id}`); // Debug Log

        const { data, error } = await supabase
            .from('coaches')
            .update({ is_approved: true })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Supabase Update Error:', error); // Debug Log
            throw error;
        }

        console.log('Update Success:', data); // Debug Log
        res.json({ message: 'Coach approved successfully', data });
    } catch (error) {
        console.error('Approve Coach Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all APPROVED coaches
// @route   GET /api/admin/coaches
// @access  Private (Admin)
const getApprovedCoaches = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('coaches')
            .select(`
                *,
                users:user_id (name, email, phone)
            `)
            .eq('is_approved', true);

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
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
    getPendingCoaches,
    approveCoach,
    getApprovedCoaches,
    getAllUsers,
};
