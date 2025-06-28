const User = require('../../models/User');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const { createOrUpdateConversation } = require('./conversationHelpers');

const sendMessage = async (io, socket, { recipientId, content }) => {
    console.log('send_private_message', { recipientId, content });
    try {
        // Input validation
        if (!recipientId || !content) {
            socket.emit('error', { 
                context: 'send_message', 
                message: 'Missing required fields: recipientId or content' 
            });
            return;
        }

        const sender = await User.findOne({ socketId: socket.id });
        const recipient = await User.findById(recipientId);
        
        if (!sender) {
            console.error('Sender not found with socketId:', socket.id);
            socket.emit('error', { context: 'send_message', message: 'Sender not found' });
            return;
        }
        
        if (!recipient) {
            console.error('Recipient not found with id:', recipientId);
            socket.emit('error', { context: 'send_message', message: 'Recipient not found' });
            return;
        }
        
        console.log('Creating message between:', { 
            sender: { id: sender._id, username: sender.username },
            recipient: { id: recipient._id, username: recipient.username }
        });

        const message = new Message({
            sender: sender._id,
            recipient: recipient._id,
            content
        });
        
        const savedMessage = await message.save();
        console.log('Message saved:', savedMessage);

        try {
            await savedMessage.populate('sender', 'username');
            await savedMessage.populate('recipient', 'username');
        } catch (populateError) {
            console.error('Error populating message:', populateError);
        }

        const formattedMessage = {
            id: savedMessage._id,
            content,
            sender: sender.username,
            recipient: recipient.username,
            timestamp: savedMessage.createdAt
        };

        console.log('Emitting message to:', sender._id.toString(), recipient._id.toString());
        
        // Emit to sender and recipient using rooms instead of socketId
        io.to(sender._id.toString()).emit('receive_private_message', formattedMessage);
        io.to(recipient._id.toString()).emit('receive_private_message', formattedMessage);

        // Create or update conversation
        await createOrUpdateConversation(sender._id, recipient._id, content);
        
        // Acknowledge message delivery to sender
        socket.emit('message_delivered', { 
            messageId: savedMessage._id,
            recipientId: recipient._id
        });
        
    } catch (error) {
        console.error('Error in send_private_message:', error);
        socket.emit('error', { context: 'send_message', message: error.message });
    }
};

module.exports = sendMessage; 