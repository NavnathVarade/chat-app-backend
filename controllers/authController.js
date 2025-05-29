const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ 
    $or: [{ email }, { username }] 
  });

  if (userExists) {
    throw new ApiError('User already exists with that email or username', 400);
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    verificationToken
  });

  // Send verification email
  await sendVerificationEmail(user.email, verificationToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful! Please check your email to verify your account.'
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Check if user is verified
  if (!user.isVerified) {
    throw new ApiError('Please verify your email before logging in', 403);
  }

  // Generate tokens
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Update user status to online
  user.status = 'online';
  user.lastSeen = Date.now();
  await user.save();

  sendTokenResponse(user, 200, res, token, refreshToken);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Update user status to offline
  req.user.status = 'offline';
  req.user.lastSeen = Date.now();
  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Find user with verification token
  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    throw new ApiError('Invalid or expired verification token', 400);
  }

  // Update user verification status
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now login.'
  });
});

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError('User not found with that email', 404);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Set token and expiration on user model
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  await user.save();

  // Send password reset email
  try {
    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    throw new ApiError('Email could not be sent', 500);
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Find user by token
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError('Invalid or expired reset token', 400);
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.'
  });
});

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError('No refresh token provided', 400);
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Generate new access token
    const newAccessToken = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    throw new ApiError('Invalid refresh token', 401);
  }
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * Helper function to send token response
 */
const sendTokenResponse = (user, statusCode, res, token, refreshToken) => {
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    user,
    token,
    refreshToken
  });
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  getMe
};