const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       required:
 *         - sender
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         sender:
 *           type: string
 *           description: ID of the user who sent the message
 *         content:
 *           type: string
 *           description: Content of the message
 *         conversation:
 *           type: string
 *           description: ID of the conversation this message belongs to (one-to-one)
 *         group:
 *           type: string
 *           description: ID of the group this message belongs to (group chat)
 *         readBy:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who have read this message
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [image, file, audio, video]
 *               url:
 *                 type: string
 *               filename:
 *                 type: string
 *         isDeleted:
 *           type: boolean
 *           description: Whether the message has been deleted
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  // Reference to either a conversation (one-to-one) or a group
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'audio', 'video']
    },
    url: String,
    filename: String,
    size: Number
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure the message belongs to either a conversation or a group, but not both
MessageSchema.pre('save', function(next) {
  if ((this.conversation && this.group) || (!this.conversation && !this.group)) {
    const error = new Error('Message must belong to either a conversation or a group, but not both');
    return next(error);
  }
  next();
});

// Virtual for checking if message has been read by a specific user
MessageSchema.virtual('isReadBy').get(function(userId) {
  return this.readBy.includes(userId);
});

module.exports = mongoose.model('Message', MessageSchema);