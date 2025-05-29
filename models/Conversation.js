const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       required:
 *         - participants
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs participating in the conversation
 *         lastMessage:
 *           type: string
 *           description: ID of the last message in this conversation
 *         unreadCount:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           description: Object with user IDs as keys and unread message counts as values
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Participants are required']
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure there are exactly 2 participants in a conversation (for one-to-one chats)
ConversationSchema.pre('save', function(next) {
  if (this.isNew && this.participants.length !== 2) {
    const error = new Error('A conversation must have exactly 2 participants');
    return next(error);
  }
  next();
});

// Create a compound index to ensure uniqueness of participant pairs
ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);