const supabase = require('../../config/supabase');


async function updateReward(user_id, eventType, amount) {
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

        let coins;

        if (coinMapping.type == 'coin') {
            coins = coinMapping.coin_value;
            console.log("coinsssssssss", coins);
        } else {
            if (!amount) throw new Error("Amount required for percentage reward");
            coins = Math.floor((amount * coinMapping.coin_value) / 100);
            console.log("coinstttt", coins);
        }



        const { error: txError } = await supabase
            .from('user_coin_transactions')
            .insert([{
                user_id: user_id,
                coin_mapping_id: coinMapping.id,
                coins: coinMapping.coin_value,
                transaction_type: 'credit'
            }]);


        // const { data: order, error: orderError } = await supabase
        //     .from("orders")
        //     .select("total_price")
        //     .eq("user_id", user_id)
        //     .single();
        const newBalance = user.wallet_balance + coins;
        // let coins;

        // if (coinMapping.type === 'coin') {
        //     coins = coinMapping.coin_value;
        // } else {
        //     if (!amount) throw new Error("Amount required for percentage reward");
        //     coins = Math.floor((amount * coinMapping.coin_value) / 100);
        // }

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