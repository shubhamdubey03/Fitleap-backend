const supabase = require("../../config/supabase");

exports.createPlan = async (req, res) => {
    try {

        const { plan_name, description, days, price } = req.body;
        const adminId = req.user.id;

        if (req.user.role !== "admin") {
            return res.status(403).json({
                error: "Only admin can create plans"
            });
        }

        const { data, error } = await supabase
            .from("pc_subscription_plans")
            .insert([
                {
                    plan_name,
                    description,
                    days,
                    price,
                    created_by: adminId
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: "Plan created successfully",
            plan: data
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getPlans = async (req, res) => {
    try {

        const { data, error } = await supabase
            .from("pc_subscription_plans")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({
            plans: data
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updatePlan = async (req, res) => {
    try {

        const { id } = req.params;
        const { plan_name, description, days, price, is_active } = req.body;

        if (req.user.role !== "admin") {
            return res.status(403).json({
                error: "Only admin can update plans"
            });
        }

        const { data, error } = await supabase
            .from("pc_subscription_plans")
            .update({
                plan_name,
                description,
                days,
                price,
                is_active,
                updated_at: new Date()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: "Plan updated successfully",
            plan: data
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deletePlan = async (req, res) => {
    try {

        const { id } = req.params;

        if (req.user.role !== "admin") {
            return res.status(403).json({
                error: "Only admin can delete plans"
            });
        }

        const { error } = await supabase
            .from("pc_subscription_plans")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({
            message: "Plan deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};