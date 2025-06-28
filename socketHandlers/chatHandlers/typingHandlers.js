const User = require('../../models/User');

// Track typing status with timestamps to implement debouncing
const typingUsers = new Map();

// Default debounce timeout in milliseconds
const TYPING_TIMEOUT = 2000;

// Handler for typing indicator events
const handleTyping = async (io, socket, { recipientId, isTyping }) => {
    try {
        if (!recipientId) {
            socket.emit('error', { context: 'typing', message: 'Recipient ID is required' });
            return;
        }

        const sender = await User.findOne({ socketId: socket.id });
        if (!sender) {
            socket.emit('error', { context: 'typing', message: 'Sender not found' });
            return;
        }

        // Create a unique key for this typing session
        const typingKey = `${sender._id}_${recipientId}`;
        
        // Clear any existing timeout for this user
        if (typingUsers.has(typingKey)) {
            clearTimeout(typingUsers.get(typingKey).timeoutId);
        }

        if (isTyping) {
            // Set a timeout to automatically clear typing status
            const timeoutId = setTimeout(() => {
                // Auto-clear typing status after timeout
                io.to(recipientId.toString()).emit('user_typing', {
                    userId: sender._id,
                    username: sender.username,
                    isTyping: false
                });
                typingUsers.delete(typingKey);
            }, TYPING_TIMEOUT);

            // Store the timeout ID
            typingUsers.set(typingKey, { 
                timeoutId,
                timestamp: Date.now() 
            });
        } else {
            // User explicitly stopped typing
            typingUsers.delete(typingKey);
        }

        // Emit typing status to recipient using room
        io.to(recipientId.toString()).emit('user_typing', {
            userId: sender._id,
            username: sender.username,
            isTyping
        });
    } catch (error) {
        console.error('Error in typing handler:', error);
        socket.emit('error', { context: 'typing', message: error.message });
    }
};

module.exports = {
    handleTyping
}; 