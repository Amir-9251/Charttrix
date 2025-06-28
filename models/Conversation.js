const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    conversationHash: {
        type: String,
        index: true
    },
    lastMessage: {
        type: String
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Create indexes for better performance
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
