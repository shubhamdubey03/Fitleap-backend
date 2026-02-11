const User = require('../models/User');
const Event = require('../models/Event');
const CoinHistory = require('../models/CoinHistory');


// 1️⃣ Earn from Event
exports.earnFromEvent = async (req, res) => {
    const { eventId } = req.body;

    const event = await Event.findById(eventId);
    if (!event || !event.isActive)
        return res.status(400).json({ message: "Event not valid" });

    await User.findByIdAndUpdate(
        req.userId,
        { $inc: { coinBalance: event.rewardCoins } }
    );

    await CoinHistory.create({
        userId: req.userId,
        type: "EARN",
        amount: event.rewardCoins,
        source: "EVENT",
        referenceId: eventId
    });

    res.json({ message: "Coins added", coins: event.rewardCoins });
};


// 2️⃣ Earn from Order
exports.earnFromOrder = async (req, res) => {
    const { orderAmount } = req.body;

    const coins = Math.floor(orderAmount / 10); // example logic

    await User.findByIdAndUpdate(
        req.userId,
        { $inc: { coinBalance: coins } }
    );

    await CoinHistory.create({
        userId: req.userId,
        type: "EARN",
        amount: coins,
        source: "ORDER"
    });

    res.json({ coinsEarned: coins });
};


// 3️⃣ Spend Coins
exports.spendCoins = async (req, res) => {
    const { coins } = req.body;

    const user = await User.findById(req.userId);

    if (user.coinBalance < coins)
        return res.status(400).json({ message: "Insufficient coins" });

    user.coinBalance -= coins;
    await user.save();

    await CoinHistory.create({
        userId: req.userId,
        type: "SPEND",
        amount: coins,
        source: "PURCHASE"
    });

    res.json({ message: "Coins deducted" });
};


// 4️⃣ Get Coin History
exports.getHistory = async (req, res) => {
    const history = await CoinHistory.find({ userId: req.userId })
        .sort({ createdAt: -1 });

    res.json(history);
};
