const express = require('express');
const {
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
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { apiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by username or email
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authorized
 */
router.get('/', getUsers);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [online, offline, away, busy]
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark]
 *                   notifications:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Invalid data
 */
router.put('/profile', updateProfile);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.put('/change-password', changePassword);

/**
 * @swagger
 * /api/users/status:
 *   put:
 *     summary: Update user status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, away, busy]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 */
router.put('/status', updateStatus);

/**
 * @swagger
 * /api/users/friends:
 *   get:
 *     summary: Get user's friends list
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends
 *       401:
 *         description: Not authorized
 */
router.get('/friends', getFriends);

/**
 * @swagger
 * /api/users/friend-requests:
 *   get:
 *     summary: Get user's pending friend requests
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friend requests
 *       401:
 *         description: Not authorized
 */
router.get('/friend-requests', getFriendRequests);

/**
 * @swagger
 * /api/users/{id}/friend-request:
 *   post:
 *     summary: Send friend request to a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request sent
 *       400:
 *         description: Invalid request
 *       404:
 *         description: User not found
 */
router.post('/:id/friend-request', apiLimiter, sendFriendRequest);

/**
 * @swagger
 * /api/users/friend-request/{id}:
 *   put:
 *     summary: Accept or reject a friend request
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Friend request processed
 *       400:
 *         description: Invalid action
 *       404:
 *         description: Request not found
 */
router.put('/friend-request/:id', respondToFriendRequest);

/**
 * @swagger
 * /api/users/friends/{id}:
 *   delete:
 *     summary: Remove a friend
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed
 *       404:
 *         description: User not found
 */
router.delete('/friends/:id', removeFriend);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get('/:id', getUser);

module.exports = router;