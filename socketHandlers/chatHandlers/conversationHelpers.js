const Conversation = require('../../models/Conversation');

// Function to create a consistent hash for conversation between two users
const createConversationHash = (userId1, userId2) => {
    // Sort IDs to ensure consistency regardless of who initiates the conversation
    const sortedIds = [userId1.toString(), userId2.toString()].sort();
    return sortedIds.join('_');
};

// Function to create or update a conversation between two users
const createOrUpdateConversation = async (senderId, recipientId, content) => {
    try {
        // Create a consistent hash for the conversation
        const conversationHash = createConversationHash(senderId, recipientId);
        
        // First check if the conversation exists
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] },
            conversationHash
        });
        
        if (conversation) {
            // Update existing conversation
            conversation.lastMessage = content;
            conversation.lastUpdated = new Date();
            await conversation.save();
            console.log('Conversation updated:', conversation._id);
        } else {
            // Create new conversation with hash
            conversation = new Conversation({
                participants: [senderId, recipientId],
                conversationHash,
                lastMessage: content,
                lastUpdated: new Date()
            });
            await conversation.save();
            console.log('New conversation created:', conversation._id);
        }
        
        return conversation;
    } catch (error) {
        console.error('Error in createOrUpdateConversation:', error);
        throw error;
    }
};

module.exports = {
    createConversationHash,
    createOrUpdateConversation
}; 