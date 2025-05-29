const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Get all conversations for a user
 * @route   GET /api/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Find all conversations where user is a participant
  const conversations = await Conversation.find({
    participants: req.user.id,
    isActive: true
  })
    .populate({
      path: 'participants',
      select: 'username avatar status lastSeen',
      match: { _id: { $ne: req.user.id } } // Exclude current user
    })
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt readBy',
      populate: { path: 'sender', select: 'username avatar' }
    })
    .sort({ updatedAt: -1 }) // Sort by most recent activity
    .skip(startIndex)
    .limit(limit);
  
  const total = await Conversation.countDocuments({
    participants: req.user.id,
    isActive: true
  });
  
  // Add unread count for each conversation
  const conversationsWithUnread = conversations.map(conversation => {
    const conversationObj = conversation.toObject();
    conversationObj.unreadCount = conversation.unreadCount.get(req.user.id.toString()) || 0;
    return conversationObj;
  });
  
  res.status(200).json({
    success: true,
    count: conversationsWithUnread.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: conversationsWithUnread
  });
});

/**
 * @desc    Create a new conversation
 * @route   POST /api/conversations
 * @access  Private
 */
const createConversation = asyncHandler(async (req, res) => {
  const { participantId } = req.body;
  
  // Check if participant exists
  const participant = await User.findById(participantId);
  
  if (!participant) {
    throw new ApiError('User not found', 404);
  }
  
  // Check if conversation already exists between these users
  const existingConversation = await Conversation.findOne({
    participants: { $all: [req.user.id, participantId], $size: 2 },
    isActive: true
  });
  
  if (existingConversation) {
    return res.status(200).json({
      success: true,
      data: existingConversation
    });
  }
  
  // Create new conversation
  const conversation = await Conversation.create({
    participants: [req.user.id, participantId],
    unreadCount: new Map([[participantId, 0]])
  });
  
  // Populate participant information
  await conversation.populate({
    path: 'participants',
    select: 'username avatar status lastSeen'
  });
  
  res.status(201).json({
    success: true,
    data: conversation
  });
});

/**
 * @desc    Get a single conversation
 * @route   GET /api/conversations/:id
 * @access  Private
 */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate({
      path: 'participants',
      select: 'username avatar status lastSeen'
    })
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt readBy',
      populate: { path: 'sender', select: 'username avatar' }
    });
  
  if (!conversation) {
    throw new ApiError('Conversation not found', 404);
  }
  
  // Check if user is a participant
  if (!conversation.participants.some(p => p._id.toString() === req.user.id)) {
    throw new ApiError('Not authorized to view this conversation', 403);
  }
  
  // Reset unread count for this user
  conversation.unreadCount.set(req.user.id.toString(), 0);
  await conversation.save();
  
  // Add unread count to response
  const conversationObj = conversation.toObject();
  conversationObj.unreadCount = 0; // Just reset it to 0
  
  res.status(200).json({
    success: true,
    data: conversationObj
  });
});

/**
 * @desc    Delete/archive a conversation
 * @route   DELETE /api/conversations/:id
 * @access  Private
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) {
    throw new ApiError('Conversation not found', 404);
  }
  
  // Check if user is a participant
  if (!conversation.participants.includes(req.user.id)) {
    throw new ApiError('Not authorized to delete this conversation', 403);
  }
  
  // Soft delete (mark as inactive)
  conversation.isActive = false;
  await conversation.save();
  
  res.status(200).json({
    success: true,
    message: 'Conversation deleted successfully'
  });
});

module.exports = {
  getConversations,
  createConversation,
  getConversation,
  deleteConversation
};