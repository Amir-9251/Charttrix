const { setupChatHandlers, broadcastNewUser } = require('./chatHandlers/index');

module.exports = { 
    chatHandlers: setupChatHandlers,
    broadcastNewUser
};
