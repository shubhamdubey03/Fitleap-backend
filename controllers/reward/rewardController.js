const supabase = require('../../config/supabase');


async function updateReward(user_id, eventType) {
    try {

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user_id)
            .single();

        if (userError) return res.status(400).json({ error: "User not found" });

        const { data: coinMapping, error: mapError } = await supabase
            .from('coin_mappings')
            .select('*')
            .eq('event_name', eventType)
            .single();


        const { error: txError } = await supabase
            .from('user_coin_transactions')
            .insert([{
                user_id: user_id,
                coin_mapping_id: coinMapping.id,
                coins: coinMapping.coin_value,
                transaction_type: 'credit'
            }]);

        const newBalance = user.wallet_balance + coinMapping.coin_value;

        const { error: walletError } = await supabase
            .from('users')
            .update({ wallet_balance: newBalance })
            .eq('id', user_id);

        if (walletError) return res.status(400).json({ error: walletError.message });

    } catch (error) {
        throw error;
    }
}

module.exports = { updateReward };