const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Search query
  const query = {};
  if (req.query.search) {
    query.$or = [
      { username: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Exclude current user
  query._id = { $ne: req.user.id };
  
  const users = await User.find(query)
    .select('-__v')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  const total = await User.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: users
  });
});

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { username, avatar, status, preferences } = req.body;
  
  // Find user
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  // Update fields
  if (username) user.username = username;
  if (avatar) user.avatar = avatar;
  if (status) user.status = status;
  if (preferences) {
    if (preferences.theme) user.preferences.theme = preferences.theme;
    if (typeof preferences.notifications === 'boolean') {
      user.preferences.notifications = preferences.notifications;
    }
  }
  
  // Save user
  await user.save();
  
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Find user with password
  const user = await User.findById(req.user.id).select('+password');
  
  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 401);
  }
  
  // Set new password
  user.password = newPassword;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

/**
 * @desc    Send friend request
 * @route   POST /api/users/:id/friend-request
 * @access  Private
 */
const sendFriendRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if user exists
  const recipient = await User.findById(id);
  
  if (!recipient) {
    throw new ApiError('User not found', 404);
  }
  
  // Check if user is trying to add themselves
  if (id === req.user.id) {
    throw new ApiError('You cannot send a friend request to yourself', 400);
  }
  
  // Check if already friends
  if (recipient.friends.includes(req.user.id)) {
    throw new ApiError('You are already friends with this user', 400);
  }
  
  // Check if friend request already sent
  const existingRequest = recipient.friendRequests.find(
    request => request.from.toString() === req.user.id
  );
  
  if (existingRequest) {
    throw new ApiError('Friend request already sent', 400);
  }
  
  // Add friend request
  recipient.friendRequests.push({
    from: req.user.id,
    status: 'pending'
  });
  
  await recipient.save();
  
  // Create notification
  await Notification.create({
    recipient: recipient._id,
    sender: req.user.id,
    type: 'friend_request',
    title: 'New Friend Request',
    content: `${req.user.username} sent you a friend request`,
    relatedTo: {
      model: 'User',
      id: req.user.id
    }
  });
  
  res.status(200).json({
    success: true,
    message: 'Friend request sent successfully'
  });
});

/**
 * @desc    Accept/Reject friend request
 * @route   PUT /api/users/friend-request/:id
 * @access  Private
 */
const respondToFriendRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  
  if (!['accept', 'reject'].includes(action)) {
    throw new ApiError('Invalid action, must be accept or reject', 400);
  }
  
  // Find current user
  const user = await User.findById(req.user.id);
  
  // Find the friend request
  const requestIndex = user.friendRequests.findIndex(
    request => request.from.toString() === id && request.status === 'pending'
  );
  
  if (requestIndex === -1) {
    throw new ApiError('Friend request not found or already processed', 404);
  }
  
  // Update request status
  user.friendRequests[requestIndex].status = action === 'accept' ? 'accepted' : 'rejected';
  
  // If accepted, add to friends list for both users
  if (action === 'accept') {
    // Add to current user's friends
    if (!user.friends.includes(id)) {
      user.friends.push(id);
    }
    
    // Add current user to the other user's friends
    const otherUser = await User.findById(id);
    if (!otherUser.friends.includes(req.user.id)) {
      otherUser.friends.push(req.user.id);
      await otherUser.save();
    }
    
    // Create notification for the request sender
    await Notification.create({
      recipient: id,
      sender: req.user.id,
      type: 'friend_request',
      title: 'Friend Request Accepted',
      content: `${user.username} accepted your friend request`,
      relatedTo: {
        model: 'User',
        id: req.user.id
      }
    });
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: `Friend request ${action}ed successfully`
  });
});

/**
 * @desc    Get friend requests
 * @route   GET /api/users/friend-requests
 * @access  Private
 */
const getFriendRequests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('friendRequests.from', 'username avatar status');
  
  const pendingRequests = user.friendRequests.filter(
    request => request.status === 'pending'
  );
  
  res.status(200).json({
    success: true,
    count: pendingRequests.length,
    data: pendingRequests
  });
});

/**
 * @desc    Get friends list
 * @route   GET /api/users/friends
 * @access  Private
 */
const getFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('friends', 'username avatar status lastSeen');
  
  res.status(200).json({
    success: true,
    count: user.friends.length,
    data: user.friends
  });
});

/**
 * @desc    Remove friend
 * @route   DELETE /api/users/friends/:id
 * @access  Private
 */
const removeFriend = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Remove from current user's friends
  await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { friends: id } }
  );
  
  // Remove current user from the other user's friends
  await User.findByIdAndUpdate(
    id,
    { $pull: { friends: req.user.id } }
  );
  
  res.status(200).json({
    success: true,
    message: 'Friend removed successfully'
  });
});

/**
 * @desc    Update user status
 * @route   PUT /api/users/status
 * @access  Private
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['online', 'offline', 'away', 'busy'].includes(status)) {
    throw new ApiError('Invalid status', 400);
  }
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { 
      status,
      lastSeen: Date.now()
    },
    { new: true }
  );
  
  res.status(200).json({
    success: true,
    data: {
      status: user.status
    }
  });
});

module.exports = {
  getUsers,
  getUser,
  updateProfile,
  changePassword,
  sendFriendRequest,
  respondToFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  updateStatus
};