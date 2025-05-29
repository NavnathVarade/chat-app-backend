const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { content, conversationId, groupId, attachments } = req.body;
  
  // Validate that either conversationId or groupId is provided, but not both
  if ((conversationId && groupId) || (!conversationId && !groupId)) {
    throw new ApiError('Please provide either a conversation ID or a group ID', 400);
  }
  
  let targetModel, targetId, recipients;
  
  // Handle one-to-one conversation message
  if (conversationId) {
    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new ApiError('Conversation not found', 404);
    }
    
    // Check if user is part of the conversation
    if (!conversation.participants.includes(req.user.id)) {
      throw new ApiError('You are not part of this conversation', 403);
    }
    
    targetModel = 'Conversation';
    targetId = conversationId;
    recipients = conversation.participants.filter(
      participant => participant.toString() !== req.user.id
    );
  }
  
  // Handle group message
  if (groupId) {
    // Check if group exists
    const group = await Group.findById(groupId);
    
    if (!group) {
      throw new ApiError('Group not found', 404);
    }
    
    // Check if user is part of the group
    if (!group.members.includes(req.user.id)) {
      throw new ApiError('You are not a member of this group', 403);
    }
    
    targetModel = 'Group';
    targetId = groupId;
    recipients = group.members.filter(
      member => member.toString() !== req.user.id
    );
  }
  
  // Create message
  const message = await Message.create({
    sender: req.user.id,
    content,
    [targetModel.toLowerCase()]: targetId,
    attachments: attachments || [],
    readBy: [req.user.id] // Sender has read the message
  });
  
  // Populate sender information
  await message.populate('sender', 'username avatar');
  
  // Update last message and unread counts
  if (targetModel === 'Conversation') {
    const conversation = await Conversation.findById(conversationId);
    
    // Update last message
    conversation.lastMessage = message._id;
    
    // Increment unread count for all participants except sender
    recipients.forEach((recipient) => {
      const recipientId = recipient.toString();
      const currentCount = conversation.unreadCount.get(recipientId) || 0;
      conversation.unreadCount.set(recipientId, currentCount + 1);
    });
    
    await conversation.save();
    
    // Create notifications for recipients
    const sender = await User.findById(req.user.id);
    
    for (const recipient of recipients) {
      await Notification.create({
        recipient,
        sender: req.user.id,
        type: 'message',
        title: 'New Message',
        content: `${sender.username} sent you a message`,
        relatedTo: {
          model: 'Message',
          id: message._id
        }
      });
    }
  } else if (targetModel === 'Group') {
    const group = await Group.findById(groupId);
    
    // Update last message
    group.lastMessage = message._id;
    
    // Increment unread count for all members except sender
    recipients.forEach((recipient) => {
      const recipientId = recipient.toString();
      const currentCount = group.unreadCount.get(recipientId) || 0;
      group.unreadCount.set(recipientId, currentCount + 1);
    });
    
    await group.save();
    
    // Create notifications for group members
    const sender = await User.findById(req.user.id);
    
    for (const recipient of recipients) {
      await Notification.create({
        recipient,
        sender: req.user.id,
        type: 'message',
        title: `New Message in ${group.name}`,
        content: `${sender.username} sent a message in ${group.name}`,
        relatedTo: {
          model: 'Message',
          id: message._id
        }
      });
    }
  }
  
  res.status(201).json({
    success: true,
    data: message
  });
});

/**
 * @desc    Get messages for a conversation or group
 * @route   GET /api/messages/conversation/:id or /api/messages/group/:id
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query; // 'conversation' or 'group'
  
  if (!['conversation', 'group'].includes(type)) {
    throw new ApiError('Please specify a valid type (conversation or group)', 400);
  }
  
  // Validate conversation/group exists and user is a member
  let targetModel;
  
  if (type === 'conversation') {
    targetModel = await Conversation.findById(id);
    if (!targetModel) {
      throw new ApiError('Conversation not found', 404);
    }
    if (!targetModel.participants.includes(req.user.id)) {
      throw new ApiError('You are not part of this conversation', 403);
    }
  } else {
    targetModel = await Group.findById(id);
    if (!targetModel) {
      throw new ApiError('Group not found', 404);
    }
    if (!targetModel.members.includes(req.user.id)) {
      throw new ApiError('You are not a member of this group', 403);
    }
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  
  // Query messages
  const queryObj = {
    [type]: id,
    isDeleted: false
  };
  
  const messages = await Message.find(queryObj)
    .sort({ createdAt: -1 }) // Newest first
    .skip(startIndex)
    .limit(limit)
    .populate('sender', 'username avatar')
    .populate('readBy', 'username avatar');
  
  const total = await Message.countDocuments(queryObj);
  
  // Mark messages as read
  if (type === 'conversation') {
    // Reset unread count for this user
    targetModel.unreadCount.set(req.user.id.toString(), 0);
    await targetModel.save();
  } else if (type === 'group') {
    // Reset unread count for this user
    targetModel.unreadCount.set(req.user.id.toString(), 0);
    await targetModel.save();
  }
  
  // Mark all unread messages as read
  await Message.updateMany(
    {
      [type]: id,
      sender: { $ne: req.user.id },
      readBy: { $ne: req.user.id }
    },
    {
      $addToSet: { readBy: req.user.id }
    }
  );
  
  res.status(200).json({
    success: true,
    count: messages.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: messages.reverse() // Return in chronological order (oldest first)
  });
});

/**
 * @desc    Delete a message
 * @route   DELETE /api/messages/:id
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  
  if (!message) {
    throw new ApiError('Message not found', 404);
  }
  
  // Check ownership
  if (message.sender.toString() !== req.user.id) {
    throw new ApiError('Not authorized to delete this message', 403);
  }
  
  // Soft delete the message
  message.isDeleted = true;
  message.content = 'This message has been deleted';
  message.attachments = [];
  
  await message.save();
  
  res.status(200).json({
    success: true,
    message: 'Message deleted successfully'
  });
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  
  if (!messageIds || !Array.isArray(messageIds)) {
    throw new ApiError('Please provide an array of message IDs', 400);
  }
  
  await Message.updateMany(
    {
      _id: { $in: messageIds },
      readBy: { $ne: req.user.id }
    },
    {
      $addToSet: { readBy: req.user.id }
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Messages marked as read'
  });
});

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage,
  markAsRead
};