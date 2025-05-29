const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       required:
 *         - name
 *         - creator
 *         - members
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         name:
 *           type: string
 *           description: Name of the group
 *         description:
 *           type: string
 *           description: Description of the group
 *         creator:
 *           type: string
 *           description: ID of the user who created the group
 *         members:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who are members of the group
 *         admins:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who have admin privileges in the group
 *         avatar:
 *           type: string
 *           description: URL to group's avatar image
 *         lastMessage:
 *           type: string
 *           description: ID of the last message in this group
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

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: [3, 'Group name must be at least 3 characters long'],
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'At least one member is required']
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  avatar: {
    type: String,
    default: function() {
      // Default avatar based on first letter of group name
      return `https://ui-avatars.com/api/?name=${this.name.charAt(0)}&background=random`;
    }
  },
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

// Set creator as the first admin
GroupSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.admins.includes(this.creator)) {
      this.admins.push(this.creator);
    }
    if (!this.members.includes(this.creator)) {
      this.members.push(this.creator);
    }
  }
  next();
});

// Ensure at least one admin exists
GroupSchema.pre('save', function(next) {
  if (this.admins.length === 0) {
    const error = new Error('Group must have at least one admin');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Group', GroupSchema);