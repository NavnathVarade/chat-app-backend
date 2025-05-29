const express = require('express');
const {
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
} = require('../controllers/groupController');
const { protect } = require('../middlewares/auth');
const { groupValidation, validateRequest } = require('../middlewares/validator');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups for the current user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of groups
 */
router.get('/', getGroups);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Group created
 *       400:
 *         description: Invalid request data
 */
router.post('/', groupValidation, validateRequest, createGroup);

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     summary: Get a specific group
 *     tags: [Groups]
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
 *         description: Group details
 *       404:
 *         description: Group not found
 */
router.get('/:id', getGroup);

/**
 * @swagger
 * /api/groups/{id}:
 *   put:
 *     summary: Update a group
 *     tags: [Groups]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group updated
 *       403:
 *         description: Not authorized to update group
 *       404:
 *         description: Group not found
 */
router.put('/:id', updateGroup);

/**
 * @swagger
 * /api/groups/{id}/members:
 *   put:
 *     summary: Add members to a group
 *     tags: [Groups]
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
 *               - members
 *             properties:
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Members added
 *       403:
 *         description: Not authorized to add members
 *       404:
 *         description: Group not found
 */
router.put('/:id/members', addMembers);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Not authorized to remove member
 *       404:
 *         description: Group not found
 */
router.delete('/:id/members/:userId', removeMember);

/**
 * @swagger
 * /api/groups/{id}/admins/{userId}:
 *   put:
 *     summary: Make a member an admin
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User promoted to admin
 *       403:
 *         description: Not authorized to promote members
 *       404:
 *         description: Group not found
 */
router.put('/:id/admins/:userId', makeAdmin);

/**
 * @swagger
 * /api/groups/{id}/admins/{userId}:
 *   delete:
 *     summary: Remove admin status from a member
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin status removed
 *       403:
 *         description: Not authorized to demote admins
 *       404:
 *         description: Group not found
 */
router.delete('/:id/admins/:userId', removeAdmin);

/**
 * @swagger
 * /api/groups/{id}/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
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
 *         description: Left group successfully
 *       404:
 *         description: Group not found
 */
router.post('/:id/leave', leaveGroup);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Delete/archive a group
 *     tags: [Groups]
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
 *         description: Group deleted
 *       403:
 *         description: Not authorized to delete group
 *       404:
 *         description: Group not found
 */
router.delete('/:id', deleteGroup);

module.exports = router;