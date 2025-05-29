const express = require('express');
const {
  sendMessage,
  getMessages,
  deleteMessage,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middlewares/auth');
const { messageValidation, validateRequest } = require('../middlewares/validator');
const { apiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               conversationId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [image, file, audio, video]
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Invalid request data
 */
router.post('/', messageValidation, validateRequest, apiLimiter, sendMessage);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get messages for a conversation or group
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [conversation, group]
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Conversation or group not found
 */
router.get('/', getMessages);

/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
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
 *         description: Message deleted
 *       403:
 *         description: Not authorized to delete this message
 *       404:
 *         description: Message not found
 */
router.delete('/:id', deleteMessage);

/**
 * @swagger
 * /api/messages/read:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       400:
 *         description: Invalid request
 */
router.put('/read', markAsRead);

module.exports = router;