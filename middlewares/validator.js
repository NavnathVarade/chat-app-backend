const { body, validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

// Validate request data
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Extract the first error message
    const firstError = errors.array()[0];
    return next(new ApiError(firstError.msg, 400));
  }
  next();
};

// Validation rules for user registration
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Validation rules for user login
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
];

// Validation rules for password reset request
const resetRequestValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
];

// Validation rules for password reset
const resetPasswordValidation = [
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Validation rules for creating a message
const messageValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Message content is required')
    .isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
  
  body('conversationId')
    .optional()
    .isMongoId().withMessage('Invalid conversation ID'),
  
  body('groupId')
    .optional()
    .isMongoId().withMessage('Invalid group ID')
];

// Validation rules for creating a group
const groupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Group name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Group name must be between 3 and 50 characters'),
  
  body('members')
    .isArray({ min: 1 }).withMessage('Group must have at least one member')
    .custom(members => {
      if (!members.every(member => typeof member === 'string')) {
        throw new Error('Invalid member ID format');
      }
      return true;
    })
];

module.exports = {
  validateRequest,
  registerValidation,
  loginValidation,
  resetRequestValidation,
  resetPasswordValidation,
  messageValidation,
  groupValidation
};