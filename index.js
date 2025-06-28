const express = require("express");
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
const corsOptions = {
    origin: [
        "http://localhost:5173", 
        "http://localhost:3000",
        process.env.CLIENT_URL // Production frontend URL
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB first
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Session configuration with MongoDB as session store
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        stringify: false,
        autoRemove: 'interval',
        autoRemoveInterval: 60 // 1 hour
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Import and use auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const io = new Server(server, {
    cors: corsOptions
});

// Import socket handlers
const authHandlers = require('./socketHandlers/authHandlers');
const { chatHandlers } = require('./socketHandlers/chatHandlers');

// Socket.IO connection handling
io.on('connection', async (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Initialize handlers
    authHandlers(io, socket);
    chatHandlers(io, socket);
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
    console.log(`Server is running on port ${port}...`);
});