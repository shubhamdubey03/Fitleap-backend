const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const path = require('path');


const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const feedbackRoutes = require('./routes/feedbackRoutes');
const locationRoutes = require('./routes/location');
const invoiceRoutes = require('./routes/invoiceRoutes');
const stateRoutes = require('./routes/stateRoute/stateRoutes');
const chatRoutes = require("./routes/chatRoute/chatRoutes");
const messageRoutes = require("./routes/chatRoute/messageRoutes");
const workoutRoutes = require('./routes/workRoutes/workRoutes');
const workoutCategoryRoutes = require('./routes/workRoutes/workoutCategoryRoutes');


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
app.use('/api', locationRoutes);
app.use('/api', stateRoutes);
app.use('/api/products', require('./routes/productRoutes'));
const authRoutes = require('./routes/authRoutes');
app.use('/api/vendors', require('./routes/vendorRoute/vendorRoutes'));


app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/subscriptions', require('./routes/agoraRoutes/subscriptions.routes'));
app.use('/api/v1', require('./routes/agoraRoutes/availability.routes'));
app.use('/api/v1', require('./routes/agoraRoutes/slots.routes'));
app.use('/api/v1/appointments', require('./routes/agoraRoutes/appointments.routes'));
app.use('/api/workouts', workoutRoutes);
app.use('/api/workout-categories', workoutCategoryRoutes);


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
        console.log(`User ${userId} joined their personal room`);
    });

    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
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
