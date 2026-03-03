const supabase = require('../../config/supabase');

async function updateReward(user_id, eventType, amount) {
    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user_id)
            .single();

        if (userError) {
            console.error("Reward Update Error: User not found", user_id);
            return;
        }

        const { data: coinMapping, error: mapError } = await supabase
            .from('coin_mappings')
            .select('*')
            .eq('event_name', eventType)
            .single();

        if (mapError || !coinMapping) {
            console.error("Reward Update Error: Mapping not found", eventType);
            return;
        }

        let coinsCalculated;
        if (coinMapping.type == 'coin') {
            coinsCalculated = coinMapping.coin_value;
        } else {
            if (!amount) {
                console.error("Amount required for percentage reward");
                return;
            }
            // Preserve float values (e.g. 1.25 coins)
            coinsCalculated = parseFloat(((amount * coinMapping.coin_value) / 100).toFixed(2));
        }

        console.log(`Rewarding user ${user_id}: ${coinsCalculated} coins (Source: ${eventType})`);

        // Log transaction
        await supabase
            .from('user_coin_transactions')
            .insert([{
                user_id: user_id,
                coin_mapping_id: coinMapping.id,
                coins: coinsCalculated,
                transaction_type: 'credit'
            }]);

        // Update Wallet Balance
        const newBalance = parseFloat(((user.wallet_balance || 0) + coinsCalculated).toFixed(2));
        await supabase
            .from('users')
            .update({ wallet_balance: newBalance })
            .eq('id', user_id);

    } catch (error) {
        console.error("Critical Reward Update Error:", error);
    }
}

module.exports = { updateReward };