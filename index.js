const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const path = require('path');

const rewardRoutes = require('./routes/rewardRoutes');
const walletRoutes = require('./routes/walletRoutes');
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const feedbackRoutes = require('./routes/feedbackRoutes');
const locationRoutes = require('./routes/location');
const invoiceRoutes = require('./routes/invoiceRoutes');
const stateRoutes = require('./routes/stateRoute/stateRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));
app.use('/api/invoice', invoiceRoutes);
app.use('/api', feedbackRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', locationRoutes);
app.use('/api', stateRoutes);
app.use('/api/products', require('./routes/productRoutes'));
const authRoutes = require('./routes/authRoutes');
app.use('/api/vendors', require('./routes/vendorRoute/vendorRoutes'));


app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));


app.get('/', (req, res) => {
    res.send('API is running...');
});

const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store io instance in app to use in controllers
app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const startServer = server.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running on port ${PORT}`);

    // Check Supabase Connection
    const supabase = require('./config/supabase');
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('❌ Supabase Connection Failed:', error.message);
    } else {
        console.log('✅ Supabase Connected Successfully');
    }
});

server.on('error', (err) => {
    console.error('Server failed to start:', err);
});
