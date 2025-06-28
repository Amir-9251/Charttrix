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

// Validate MongoDB URI
const validateMongoDBUri = (uri) => {
    if (!uri) {
        console.error('MONGODB_URI is not defined in environment variables');
        return false;
    }
    
    // Check if it starts with mongodb:// or mongodb+srv://
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        console.error('Invalid MongoDB URI: Must start with mongodb:// or mongodb+srv://');
        return false;
    }
    
    return true;
};

// Log environment variables (without sensitive values)
console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI ? 'Set (value hidden)' : 'Not set',
    CLIENT_URL: process.env.CLIENT_URL
});

// Configure CORS for both Express and Socket.IO
const corsOptions = {
    origin: [
        "https://web-production-22041.up.railway.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
        process.env.CLIENT_URL // Production frontend URL
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Debug route to check CORS
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Debug middleware to log CORS headers
app.use((req, res, next) => {
    console.log(`Request from origin: ${req.headers.origin}`);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

app.use(express.json());

// Validate MongoDB URI before connecting
const isValidMongoUri = validateMongoDBUri(process.env.MONGODB_URI);

// Connect to MongoDB if URI is valid
if (isValidMongoUri) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.error('Cannot connect to MongoDB: Invalid URI');
}

// Session configuration
// Try different approaches to create the session store
let sessionStore;
try {
    // First approach - direct MongoStore with explicit URL
    const mongoUrl = process.env.MONGODB_URI;
    
    if (!validateMongoDBUri(mongoUrl)) {
        throw new Error('Invalid MongoDB URI format');
    }
    
    sessionStore = MongoStore.create({
        mongoUrl: mongoUrl,
        ttl: 24 * 60 * 60 // 1 day in seconds
    });
    
    console.log('Created MongoStore with mongoUrl');
} catch (error) {
    console.error('Failed to create MongoStore:', error.message);
    
    // Fallback to memory store with warning
    console.warn('WARNING: Using MemoryStore in production. This is not recommended.');
    sessionStore = undefined; // Will default to MemoryStore
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'none'
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Import and use auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Add a simple test route to verify CORS
app.get('/test-cors', (req, res) => {
    res.json({ message: 'CORS is working correctly!' });
});

// Add a health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling for invalid URLs
app.use((req, res, next) => {
    const err = new Error(`Not Found - ${req.originalUrl}`);
    err.status = 404;
    next(err);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            status: err.status || 500
        }
    });
});

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