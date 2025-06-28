const Message = require('../../models/Message');
const User = require('../../models/User');

// Handle message seen events
const handleMessageSeen = async (io, socket, { messageId }) => {
    try {
        if (!messageId) {
            socket.emit('error', { context: 'message_seen', message: 'Message ID is required' });
            return;
        }

        const user = await User.findOne({ socketId: socket.id });
        if (!user) {
            socket.emit('error', { context: 'message_seen', message: 'User not found' });
            return;
        }

        // Find and update the message
        const message = await Message.findById(messageId);
        
        if (!message) {
            socket.emit('error', { context: 'message_seen', message: 'Message not found' });
            return;
        }
        
        // Only mark as read if the current user is the recipient
        if (message.recipient.toString() !== user._id.toString()) {
            socket.emit('error', { 
                context: 'message_seen', 
                message: 'Only the recipient can mark a message as read' 
            });
            return;
        }

        // Update message status
        message.read = true;
        message.readAt = new Date();
        await message.save();

        // Notify sender that message was seen
        io.to(message.sender.toString()).emit('message_seen_ack', { 
            messageId,
            readBy: user._id,
            readAt: message.readAt
        });

        // Acknowledge to the client
        socket.emit('message_seen_success', { messageId });

    } catch (error) {
        console.error('Error in message_seen handler:', error);
        socket.emit('error', { context: 'message_seen', message: error.message });
    }
};

// Handle message delivered events
const handleMessageDelivered = async (io, socket, { messageId }) => {
    try {
        if (!messageId) {
            socket.emit('error', { context: 'message_delivered', message: 'Message ID is required' });
            return;
        }

        const message = await Message.findById(messageId);
        
        if (!message) {
            socket.emit('error', { context: 'message_delivered', message: 'Message not found' });
            return;
        }

        // Update message delivery status
        message.delivered = true;
        message.deliveredAt = new Date();
        await message.save();

        // Notify sender that message was delivered
        io.to(message.sender.toString()).emit('message_delivered_ack', { 
            messageId,
            deliveredAt: message.deliveredAt
        });

    } catch (error) {
        console.error('Error in message_delivered handler:', error);
        socket.emit('error', { context: 'message_delivered', message: error.message });
    }
};

module.exports = {
    handleMessageSeen,
    handleMessageDelivered
}; 