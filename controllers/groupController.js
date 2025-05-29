const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Create a new group
 * @route   POST /api/groups
 * @access  Private
 */
const createGroup = asyncHandler(async (req, res) => {
  const { name, description, members } = req.body;
  
  // Check if members exist
  if (members && members.length > 0) {
    const memberCount = await User.countDocuments({
      _id: { $in: members }
    });
    
    if (memberCount !== members.length) {
      throw new ApiError('One or more members are invalid', 400);
    }
  }
  
  // Create the group
  const group = await Group.create({
    name,
    description,
    creator: req.user.id,
    members: members ? [...new Set([req.user.id, ...members])] : [req.user.id],
    admins: [req.user.id]
  });
  
  // Populate creator and members
  await group.populate('creator', 'username avatar');
  await group.populate('members', 'username avatar status');
  await group.populate('admins', 'username avatar');
  
  // Create notifications for members
  const membersToNotify = group.members.filter(
    member => member._id.toString() !== req.user.id
  );
  
  for (const member of membersToNotify) {
    await Notification.create({
      recipient: member._id,
      sender: req.user.id,
      type: 'group_invitation',
      title: 'New Group Invitation',
      content: `${req.user.username} added you to the group "${group.name}"`,
      relatedTo: {
        model: 'Group',
        id: group._id
      }
    });
  }
  
  res.status(201).json({
    success: true,
    data: group
  });
});

/**
 * @desc    Get all groups for a user
 * @route   GET /api/groups
 * @access  Private
 */
const getGroups = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Find all groups where user is a member
  const groups = await Group.find({
    members: req.user.id,
    isActive: true
  })
    .populate('creator', 'username avatar')
    .populate('members', 'username avatar status')
    .populate('admins', 'username avatar')
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt readBy',
      populate: { path: 'sender', select: 'username avatar' }
    })
    .sort({ updatedAt: -1 }) // Sort by most recent activity
    .skip(startIndex)
    .limit(limit);
  
  const total = await Group.countDocuments({
    members: req.user.id,
    isActive: true
  });
  
  // Add unread count for each group
  const groupsWithUnread = groups.map(group => {
    const groupObj = group.toObject();
    groupObj.unreadCount = group.unreadCount.get(req.user.id.toString()) || 0;
    return groupObj;
  });
  
  res.status(200).json({
    success: true,
    count: groupsWithUnread.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: groupsWithUnread
  });
});

/**
 * @desc    Get a single group
 * @route   GET /api/groups/:id
 * @access  Private
 */
const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('creator', 'username avatar')
    .populate('members', 'username avatar status lastSeen')
    .populate('admins', 'username avatar')
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt readBy',
      populate: { path: 'sender', select: 'username avatar' }
    });
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if user is a member
  if (!group.members.some(m => m._id.toString() === req.user.id)) {
    throw new ApiError('You are not a member of this group', 403);
  }
  
  // Reset unread count for this user
  group.unreadCount.set(req.user.id.toString(), 0);
  await group.save();
  
  // Add unread count to response
  const groupObj = group.toObject();
  groupObj.unreadCount = 0; // Just reset it to 0
  
  res.status(200).json({
    success: true,
    data: groupObj
  });
});

/**
 * @desc    Update a group
 * @route   PUT /api/groups/:id
 * @access  Private
 */
const updateGroup = asyncHandler(async (req, res) => {
  const { name, description, avatar } = req.body;
  
  let group = await Group.findById(req.params.id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if user is an admin
  if (!group.admins.includes(req.user.id)) {
    throw new ApiError('Only group admins can update group details', 403);
  }
  
  // Update fields
  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  if (avatar) group.avatar = avatar;
  
  await group.save();
  
  // Populate references
  await group.populate('creator', 'username avatar');
  await group.populate('members', 'username avatar status');
  await group.populate('admins', 'username avatar');
  
  res.status(200).json({
    success: true,
    data: group
  });
});

/**
 * @desc    Add members to group
 * @route   PUT /api/groups/:id/members
 * @access  Private
 */
const addMembers = asyncHandler(async (req, res) => {
  const { members } = req.body;
  
  if (!members || !Array.isArray(members) || members.length === 0) {
    throw new ApiError('Please provide an array of member IDs', 400);
  }
  
  const group = await Group.findById(req.params.id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if user is an admin
  if (!group.admins.includes(req.user.id)) {
    throw new ApiError('Only group admins can add members', 403);
  }
  
  // Check if members exist
  const users = await User.find({
    _id: { $in: members }
  });
  
  if (users.length !== members.length) {
    throw new ApiError('One or more users are invalid', 400);
  }
  
  // Filter out members who are already in the group
  const newMembers = members.filter(
    member => !group.members.includes(member)
  );
  
  if (newMembers.length === 0) {
    throw new ApiError('All specified users are already members of this group', 400);
  }
  
  // Add new members
  group.members.push(...newMembers);
  await group.save();
  
  // Create notifications for new members
  for (const memberId of newMembers) {
    await Notification.create({
      recipient: memberId,
      sender: req.user.id,
      type: 'group_invitation',
      title: 'New Group Invitation',
      content: `${req.user.username} added you to the group "${group.name}"`,
      relatedTo: {
        model: 'Group',
        id: group._id
      }
    });
  }
  
  // Populate references
  await group.populate('creator', 'username avatar');
  await group.populate('members', 'username avatar status');
  await group.populate('admins', 'username avatar');
  
  res.status(200).json({
    success: true,
    message: `${newMembers.length} member(s) added successfully`,
    data: group
  });
});

/**
 * @desc    Remove member from group
 * @route   DELETE /api/groups/:id/members/:userId
 * @access  Private
 */
const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  
  const group = await Group.findById(id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if the target user is in the group
  if (!group.members.includes(userId)) {
    throw new ApiError('User is not a member of this group', 400);
  }
  
  // Validate permission: only admins can remove others, users can remove themselves
  const isAdmin = group.admins.includes(req.user.id);
  const isSelf = req.user.id === userId;
  
  if (!isAdmin && !isSelf) {
    throw new ApiError('You do not have permission to remove this member', 403);
  }
  
  // Prevent removing the creator unless they're removing themselves
  const isCreator = group.creator.toString() === userId;
  if (isCreator && !isSelf) {
    throw new ApiError('The group creator cannot be removed', 403);
  }
  
  // Handle last admin case
  const isLastAdmin = isAdmin && 
                      group.admins.length === 1 && 
                      group.admins[0].toString() === userId;
  
  if (isLastAdmin && group.members.length > 1) {
    throw new ApiError('Cannot remove the last admin. Assign a new admin first', 400);
  }
  
  // Remove from members
  group.members = group.members.filter(
    member => member.toString() !== userId
  );
  
  // Remove from admins if applicable
  if (group.admins.includes(userId)) {
    group.admins = group.admins.filter(
      admin => admin.toString() !== userId
    );
  }
  
  // If group is empty, mark as inactive
  if (group.members.length === 0) {
    group.isActive = false;
  }
  
  await group.save();
  
  res.status(200).json({
    success: true,
    message: 'Member removed successfully'
  });
});

/**
 * @desc    Make a member admin
 * @route   PUT /api/groups/:id/admins/:userId
 * @access  Private
 */
const makeAdmin = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  
  const group = await Group.findById(id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if user is already an admin
  if (group.admins.includes(userId)) {
    throw new ApiError('User is already an admin', 400);
  }
  
  // Check if current user is an admin
  if (!group.admins.includes(req.user.id)) {
    throw new ApiError('Only admins can promote members to admin', 403);
  }
  
  // Check if target user is a member
  if (!group.members.includes(userId)) {
    throw new ApiError('User is not a member of this group', 400);
  }
  
  // Add user to admins
  group.admins.push(userId);
  await group.save();
  
  res.status(200).json({
    success: true,
    message: 'User promoted to admin successfully'
  });
});

/**
 * @desc    Remove admin status from a member
 * @route   DELETE /api/groups/:id/admins/:userId
 * @access  Private
 */
const removeAdmin = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  
  const group = await Group.findById(id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if current user is an admin
  if (!group.admins.includes(req.user.id)) {
    throw new ApiError('Only admins can demote other admins', 403);
  }
  
  // Cannot demote the creator
  if (group.creator.toString() === userId) {
    throw new ApiError('The group creator cannot be demoted', 403);
  }
  
  // Check if user is an admin
  if (!group.admins.includes(userId)) {
    throw new ApiError('User is not an admin', 400);
  }
  
  // Check if trying to demote self
  if (req.user.id === userId) {
    throw new ApiError('You cannot demote yourself', 400);
  }
  
  // Remove user from admins
  group.admins = group.admins.filter(
    admin => admin.toString() !== userId
  );
  
  await group.save();
  
  res.status(200).json({
    success: true,
    message: 'Admin status removed successfully'
  });
});

/**
 * @desc    Leave group (remove self)
 * @route   POST /api/groups/:id/leave
 * @access  Private
 */
const leaveGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const group = await Group.findById(id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Check if user is a member
  if (!group.members.includes(req.user.id)) {
    throw new ApiError('You are not a member of this group', 400);
  }
  
  // Handle special case for creator leaving
  const isCreator = group.creator.toString() === req.user.id;
  
  if (isCreator) {
    // If creator leaving and they're the only admin, make someone else admin
    const isOnlyAdmin = group.admins.length === 1 && group.admins[0].toString() === req.user.id;
    
    if (isOnlyAdmin && group.members.length > 1) {
      // Find another member to make admin
      const newAdminId = group.members.find(
        member => member.toString() !== req.user.id
      );
      
      group.admins.push(newAdminId);
      
      // Set new creator
      group.creator = newAdminId;
    }
  }
  
  // Remove from members
  group.members = group.members.filter(
    member => member.toString() !== req.user.id
  );
  
  // Remove from admins if applicable
  if (group.admins.includes(req.user.id)) {
    group.admins = group.admins.filter(
      admin => admin.toString() !== req.user.id
    );
  }
  
  // If group is empty, mark as inactive
  if (group.members.length === 0) {
    group.isActive = false;
  }
  
  await group.save();
  
  res.status(200).json({
    success: true,
    message: 'You have left the group successfully'
  });
});

/**
 * @desc    Delete/archive a group
 * @route   DELETE /api/groups/:id
 * @access  Private
 */
const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  
  if (!group) {
    throw new ApiError('Group not found', 404);
  }
  
  // Only creator can delete group
  if (group.creator.toString() !== req.user.id) {
    throw new ApiError('Only the group creator can delete the group', 403);
  }
  
  // Soft delete (mark as inactive)
  group.isActive = false;
  await group.save();
  
  res.status(200).json({
    success: true,
    message: 'Group deleted successfully'
  });
});

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  addMembers,
  removeMember,
  makeAdmin,
  removeAdmin,
  leaveGroup,
  deleteGroup
};