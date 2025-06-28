const userJoin = require('./userJoin');
const sendMessage = require('./sendMessage');
const loadChat = require('./loadChat');
const { getAllContacts, getChatContacts } = require('./getContacts');
const { handleTyping } = require('./typingHandlers');
const { handleMessageSeen, handleMessageDelivered } = require('./messageReceipts');
const handleDisconnect = require('./disconnectHandler');
const { createConversationHash, createOrUpdateConversation } = require('./conversationHelpers');

// Function to broadcast new user to all connected clients
const broadcastNewUser = (io, newUser) => {
    const userInfo = {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profilePicture: newUser.profilePicture,
        isOnline: newUser.isOnline,
        lastSeen: newUser.lastSeen
    };
    
    io.emit('new_user_registered', userInfo);
};

// Main chat handlers setup function
const setupChatHandlers = (io, socket) => {
    // Handle user joining
    socket.on('user_join', (username) => userJoin(io, socket, username));

    // Send private message
    socket.on('send_private_message', (data) => sendMessage(io, socket, data));

    // Load chat history with a specific user
    socket.on('load_chat_with_user', (data) => loadChat(socket, data));

    // Get all registered users as contacts
    socket.on('get_all_contacts', () => getAllContacts(socket));

    // Load recent chat contacts
    socket.on('get_chat_contacts', () => getChatContacts(socket));

    // Typing indicator
    socket.on('typing', (data) => handleTyping(io, socket, data));
    
    // Message receipts
    socket.on('message_seen', (data) => handleMessageSeen(io, socket, data));
    socket.on('message_delivered', (data) => handleMessageDelivered(io, socket, data));

    // Handle disconnect
    socket.on('disconnect', () => handleDisconnect(io, socket));
};

module.exports = { 
    setupChatHandlers,
    broadcastNewUser
}; 