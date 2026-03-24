const supabase = require('../config/supabase');
const sendApprovalEmail = require('../email/sendApprovalEmail');

// @desc    Get all Coaches
// @route   GET /api/admin/coaches
// @access  Private (Admin)
const getAllCoaches = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const startIndex = (page - 1) * limit;

        let query = supabase
            .from('coaches')
            .select(`
                *,
                users:user_id!inner(name, email, phone, profile_image)
            `, { count: 'exact' });

        if (req.query.is_approved !== undefined) {
            query = query.eq('is_approved', req.query.is_approved === 'true');
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'users' });
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(startIndex, startIndex + limit - 1);

        if (error) throw error;

        res.json({
            data: data || [],
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
        });
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
        console.log("id", id)

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        // Get total count
        const { count, error: countError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Student')
            .eq('is_active', false);

        if (countError) throw countError;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'Student')
            .eq('is_active', false)
            .order('created_at', { ascending: false })
            .range(startIndex, startIndex + limit - 1);

        if (error) throw error;
        res.json({
            data: data || [],
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
        });
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
        const { id } = req.params;

        // ✅ Step 1: FIRST get user_id
        const { data: coachData, error: coachError } = await supabase
            .from('coaches')
            .select('user_id')
            .eq('id', id)
            .single();

        if (coachError || !coachData) {
            return res.status(404).json({ message: 'Coach not found' });
        }

        const user_id = coachData.user_id;

        // ✅ Step 2: delete coach
        const { error: coachDeleteError } = await supabase
            .from('coaches')
            .delete()
            .eq('id', id);

        if (coachDeleteError) throw coachDeleteError;

        // ✅ Step 3: delete user
        const { error: userDeleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', user_id);

        if (userDeleteError) throw userDeleteError;

        res.json({ message: 'Coach and user deleted successfully' });

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
