const User = require('../../models/User');

const userJoin = async (io, socket, username) => {
    try {
        const user = await User.findOneAndUpdate(
            { username },
            {
                username,
                socketId: socket.id,
                isOnline: true,
                lastSeen: new Date()
            },
            { upsert: true, new: true }
        );

        // Join a room with the user's ID for direct messaging
        socket.join(user._id.toString());

        io.emit('user_joined', {
            id: socket.id,
            username,
            timestamp: new Date()
        });

        const onlineUsers = await User.find({ isOnline: true });
        io.emit('users_list', onlineUsers);
        
        return user;
    } catch (error) {
        console.error('Error in user_join:', error);
        socket.emit('error', { context: 'user_join', message: error.message });
    }
};

module.exports = userJoin; 