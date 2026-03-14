const supabase = require('../config/supabase');
const sendApprovalEmail = require('../email/sendApprovalEmail');

// @desc    Get all Coaches
// @route   GET /api/admin/coaches
// @access  Private (Admin)
const getAllCoaches = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('coaches')
            .select(`
                *,
                users:user_id (name, email, phone, profile_image)
            `); // Removed filter .eq('is_approved', true) since approval is removed

        if (error) throw error;
        res.json({ data });
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

        // Fetch coach user details for email
        const { data: coachUser } = await supabase
            .from('coaches')
            .select('user_id, users:user_id (name, email)')
            .eq('id', id)
            .single();

        if (coachUser && coachUser.users) {
            await sendApprovalEmail(coachUser.users.email, coachUser.users.name, 'Coach');
        }

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
            .in('role', ['User', 'Student']) // Show both standard users and students
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all Student Requests (pending approval)
// @route   GET /api/admin/student-requests
// @access  Private (Admin)
const getStudentRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'Student')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Approve Student
// @route   PUT /api/admin/approve-student/:id
// @access  Private (Admin)
const approveStudent = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('users')
            .update({ is_active: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Send email to student
        if (data && data.email) {
            await sendApprovalEmail(data.email, data.name, data.role || 'Student');
        }

        res.json({
            message: 'Student approved successfully',
            user: data
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const rejectCoach = async (req, res) => {
    try {
        const { id } = req.params; // coach table id

        // Get user_id first to delete from users table too
        const { data: coach } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .maybeSingle();
        if (!coach) {
            return res.status(404).json({ message: 'Coach not found' });
        }

        // Delete from coaches table
        const { error: coachDeleteError } = await supabase
            .from('coaches')
            .delete()
            .eq('user_id', id);

        if (coachDeleteError) throw coachDeleteError;

        // Delete from users table
        const { error: userDeleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (userDeleteError) throw userDeleteError;

        res.json({ message: 'Coach request rejected and deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const rejectStudent = async (req, res) => {
    try {
        const { id } = req.params; // user id

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Student request rejected and deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getAllCoaches,
    getAllUsers,
    approveCoach,
    getStudentRequests,
    approveStudent,
    rejectCoach,
    rejectStudent,
};
