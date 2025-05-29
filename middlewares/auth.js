const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const User = require('../models/User');

/**
 * Protect routes - Verify user is authenticated
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ApiError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Check if user's account is verified
    if (!user.isVerified) {
      return next(new ApiError('Please verify your email address to access this resource', 403));
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError('Token expired, please login again', 401));
    }
    return next(new ApiError('Not authorized to access this route', 401));
  }
};

/**
 * Admin only middleware
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new ApiError('Not authorized as an admin', 403));
  }
};

module.exports = {
  protect,
  admin
};