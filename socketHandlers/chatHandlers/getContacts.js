const User = require('../../models/User');
const Conversation = require('../../models/Conversation');

// Get all registered users as contacts
const getAllContacts = async (socket) => {
    try {
        const currentUser = await User.findOne({ socketId: socket.id });
        if (!currentUser) {
            socket.emit('error', { context: 'get_contacts', message: 'User not found' });
            return;
        }

        // Get all users except the current user
        const allUsers = await User.find(
            { _id: { $ne: currentUser._id } },
            { 
                username: 1, 
                email: 1, 
                profilePicture: 1,
                isOnline: 1, 
                lastSeen: 1 
            }
        )
        .sort({ isOnline: -1, username: 1 })
        .lean(); // Use lean for better performance

        const contactsList = allUsers.map(user => ({
            id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
        }));

        socket.emit('all_contacts', contactsList);
    } catch (error) {
        console.error('Error in get_all_contacts:', error);
        socket.emit('error', { context: 'get_contacts', message: error.message });
    }
};

// Load recent chat contacts
const getChatContacts = async (socket) => {
    try {
        const currentUser = await User.findOne({ socketId: socket.id });
        if (!currentUser) {
            socket.emit('error', { context: 'get_chat_contacts', message: 'User not found' });
            return;
        }

        // Use aggregation for better performance with large datasets
        const conversations = await Conversation.aggregate([
            // Match conversations where current user is a participant
            { $match: { participants: currentUser._id } },
            // Sort by last updated time
            { $sort: { lastUpdated: -1 } },
            // Lookup to get participant details
            { $lookup: {
                from: 'users',
                localField: 'participants',
                foreignField: '_id',
                as: 'participantDetails'
            }},
            // Filter out current user from participants
            { $project: {
                lastMessage: 1,
                lastUpdated: 1,
                participantDetails: {
                    $filter: {
                        input: '$participantDetails',
                        as: 'participant',
                        cond: { $ne: ['$$participant._id', currentUser._id] }
                    }
                }
            }}
        ]);

        const chatList = conversations.map(conv => {
            const otherUser = conv.participantDetails[0];
            return {
                id: otherUser._id,
                username: otherUser.username,
                email: otherUser.email,
                isOnline: otherUser.isOnline,
                lastSeen: otherUser.lastSeen,
                lastMessage: conv.lastMessage,
                timestamp: conv.lastUpdated
            };
        });

        socket.emit('chat_contacts', chatList);
    } catch (error) {
        console.error('Error in get_chat_contacts:', error);
        socket.emit('error', { context: 'get_chat_contacts', message: error.message });
    }
};

module.exports = {
    getAllContacts,
    getChatContacts
}; 