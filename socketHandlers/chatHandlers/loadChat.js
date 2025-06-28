const User = require('../../models/User');
const Message = require('../../models/Message');

const loadChat = async (socket, { partnerId, page = 1, limit = 20 }) => {
    try {
        if (!partnerId) {
            socket.emit('error', { context: 'load_chat', message: 'Partner ID is required' });
            return;
        }

        const user = await User.findOne({ socketId: socket.id });
        if (!user) {
            socket.emit('error', { context: 'load_chat', message: 'User not found' });
            return;
        }

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Get messages with pagination
        const messages = await Message.find({
            $or: [
                { sender: user._id, recipient: partnerId },
                { sender: partnerId, recipient: user._id }
            ]
        })
            .populate('sender', 'username')
            .populate('recipient', 'username')
            .sort({ createdAt: -1 }) // Newest first for efficient pagination
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean for better performance

        // Count total messages for pagination info
        const totalMessages = await Message.countDocuments({
            $or: [
                { sender: user._id, recipient: partnerId },
                { sender: partnerId, recipient: user._id }
            ]
        });

        // Sort messages chronologically for client display
        const sortedMessages = messages.reverse();

        socket.emit('chat_history', {
            messages: sortedMessages,
            pagination: {
                page,
                limit,
                totalMessages,
                totalPages: Math.ceil(totalMessages / limit)
            }
        });

        // Mark messages as read
        await Message.updateMany(
            { 
                sender: partnerId, 
                recipient: user._id,
                read: false
            },
            { 
                $set: { read: true, readAt: new Date() } 
            }
        );

        // Notify the sender that their messages have been read
        socket.to(partnerId.toString()).emit('messages_read', {
            readBy: user._id,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error in load_chat_with_user:', error);
        socket.emit('error', { context: 'load_chat', message: error.message });
    }
};

module.exports = loadChat; 