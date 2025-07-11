# Chat Application Backend

This is the backend service for a real-time chat application built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- Real-time messaging
- User authentication
- Message receipts
- Typing indicators
- Online status tracking
- Chat history

## Prerequisites

- Node.js (v14+)
- MongoDB database
- Redis (optional, for scaling)

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the `.env.example` template
4. Start the development server:
   ```
   npm run dev
   ```

## Deployment to Render

### Automatic Deployment (Recommended)

1. Fork this repository to your GitHub account
2. Sign up for [Render](https://render.com/)
3. Create a new Web Service and connect your GitHub repository
4. Render will automatically detect the `render.yaml` configuration
5. Set up the required environment variables in the Render dashboard

### Manual Deployment

1. Sign up for [Render](https://render.com/)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add all required environment variables from `.env.example`

## Environment Variables

The following environment variables must be set for the application to work properly:

- `PORT`: The port the server will run on (default: 3001)
- `NODE_ENV`: Set to 'production' for deployment
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT authentication
- `SESSION_SECRET`: Secret key for session management
- `CLIENT_URL`: URL of your frontend application
- `REDIS_URL` (optional): Redis connection string for scaling
- Email service configuration (if using email features)
- Google OAuth configuration (if using Google authentication)

## API Documentation

### Authentication Endpoints

- `POST /auth/register`: Register a new user
- `POST /auth/login`: User login
- `POST /auth/verify-otp`: Verify OTP for registration
- `GET /auth/google`: Google OAuth login

### Socket.IO Events

- `join`: Join a user to their socket
- `get-contacts`: Get user contacts
- `load-chat`: Load chat history
- `send-message`: Send a new message
- `typing`: Send typing indicator
- `read-receipt`: Mark messages as read

## Project Structure

```
chatApp-be-main/
├── client/                  # Client-side code
├── index.js                 # Main application entry point
├── middleware/              # Express middleware
│   └── auth.js              # Authentication middleware
├── models/                  # MongoDB models
│   ├── Conversation.js      # Conversation model
│   ├── Message.js           # Message model
│   ├── OTP.js               # OTP model for verification
│   └── User.js              # User model
├── routes/                  # Express routes
│   └── auth.js              # Authentication routes
├── socketHandlers/          # Socket.IO event handlers
│   ├── authHandlers.js      # Authentication-related socket handlers
│   ├── chatHandlers.js      # Main chat handlers entry point
│   └── chatHandlers/        # Modular chat handlers
│       ├── conversationHelpers.js  # Conversation utility functions
│       ├── disconnectHandler.js    # Handle user disconnection
│       ├── getContacts.js          # Contact management
│       ├── index.js                # Main export file
│       ├── loadChat.js             # Load chat history
│       ├── messageReceipts.js      # Message delivery/read receipts
│       ├── sendMessage.js          # Send message functionality
│       ├── typingHandlers.js       # Typing indicators
│       └── userJoin.js             # User connection handling
└── utils/                   # Utility functions
    ├── emailService.js      # Email service for notifications
    └── redisClient.js       # Redis client for scalability
```

## Socket.IO Events

### Client to Server
- `user_join`: User connects to the chat
- `send_private_message`: Send a message to a specific user
- `load_chat_with_user`: Load chat history with a specific user
- `get_all_contacts`: Get all available contacts
- `get_chat_contacts`: Get recent chat contacts
- `typing`: Send typing status
- `message_seen`: Mark a message as read
- `message_delivered`: Mark a message as delivered

### Server to Client
- `user_joined`: A user has joined the chat
- `users_list`: List of online users
- `receive_private_message`: New private message received
- `chat_history`: Chat history with a specific user
- `all_contacts`: List of all contacts
- `chat_contacts`: List of recent chat contacts
- `user_typing`: User typing status
- `user_left`: A user has left the chat
- `message_seen_ack`: Message read acknowledgment
- `message_delivered_ack`: Message delivery acknowledgment
- `error`: Error messages

## Deployment Instructions

### Prerequisites
1. Node.js (v14+ recommended)
2. MongoDB database (local or MongoDB Atlas)
3. Redis (optional, for scaling)

### Environment Setup
1. Create a `.env` file in the root directory based on `.env.example`
2. Fill in all required environment variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_secure_session_secret
   JWT_SECRET=your_jwt_secret_key
   PORT=3001 (or any port your hosting provider supports)
   CLIENT_URL=your_frontend_url
   NODE_ENV=production
   ```

### Deployment Options

#### Option 1: Traditional Hosting
1. Install dependencies: `npm install --production`
2. Start the server: `npm start`

#### Option 2: Docker Deployment
1. Build the Docker image: `docker build -t chat-app-backend .`
2. Run the container: `docker run -p 3001:3001 --env-file .env chat-app-backend`

#### Option 3: Cloud Platforms
- **Heroku**: Connect your GitHub repo and deploy
- **Railway**: Import from GitHub and set environment variables
- **Render**: Create a new Web Service and connect to your repo
- **DigitalOcean App Platform**: Connect to GitHub and deploy

### Production Considerations
1. Use a process manager like PM2: `npm install -g pm2 && pm2 start index.js`
2. Set up proper logging and monitoring
3. Configure SSL/TLS for secure connections
4. Enable Redis for horizontal scaling with multiple instances

## Optimizations

- Socket.IO Rooms for direct messaging
- Debounced typing indicators
- Efficient conversation storage with hash-based lookups
- Database indexing for better performance
- Pagination for chat history
- Error handling and validation
- Redis support for horizontal scaling (optional)

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   PORT=3001
   # Optional for Redis
   REDIS_URL=redis://localhost:6379
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Redis Integration (Optional)

For production environments with multiple server instances, enable Redis support:

1. Uncomment the Redis code in `utils/redisClient.js`
2. Ensure Redis is installed and running
3. Set the `REDIS_URL` in your `.env` file #   C h a r t t r i x  
 #   C h a r t t r i x  
 