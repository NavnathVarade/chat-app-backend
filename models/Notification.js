const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - recipient
 *         - type
 *         - title
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         recipient:
 *           type: string
 *           description: ID of the user receiving the notification
 *         sender:
 *           type: string
 *           description: ID of the user who triggered the notification
 *         type:
 *           type: string
 *           enum: [message, friend_request, group_invitation, system]
 *           description: Type of notification
 *         title:
 *           type: string
 *           description: Title/headline of the notification
 *         content:
 *           type: string
 *           description: Content/body of the notification
 *         relatedTo:
 *           type: object
 *           properties:
 *             model:
 *               type: string
 *               enum: [Message, Conversation, Group, User]
 *             id:
 *               type: string
 *           description: Reference to the related entity
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['message', 'friend_request', 'group_invitation', 'system'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Message', 'Conversation', 'Group', 'User']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.model'
    }
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);