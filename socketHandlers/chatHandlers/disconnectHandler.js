const User = require('../../models/User');

const handleDisconnect = async (io, socket) => {
    try {
        const user = await User.findOne({ socketId: socket.id });
        if (user) {
            await User.findByIdAndUpdate(user._id, {
                isOnline: false,
                lastSeen: new Date()
            });

            io.emit('user_left', {
                id: socket.id,
                userId: user._id,
                username: user.username,
                timestamp: new Date()
            });

            const onlineUsers = await User.find({ isOnline: true });
            io.emit('users_list', onlineUsers);
        }
        console.log(`User Disconnected: ${socket.id}`);
    } catch (error) {
        console.error('Error in disconnect:', error);
    }
};

module.exports = handleDisconnect; 