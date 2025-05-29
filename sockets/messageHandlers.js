const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Socket handlers for message-related events
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 * @param {Map} userSockets - Map of user IDs to socket IDs
 */
const messageHandlers = (io, socket, userSockets) => {
  /**
   * New private message event
   */
  socket.on('message:private', async (data) => {
    try {
      const { conversationId, content, attachments } = data;
      
      // Validate required fields
      if (!conversationId || !content) {
        socket.emit('error', { message: 'Conversation ID and content are required' });
        return;
      }
      
      // Check if conversation exists
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }
      
      // Check if user is part of the conversation
      if (!conversation.participants.includes(socket.user.id)) {
        socket.emit('error', { message: 'Not authorized to send messages to this conversation' });
        return;
      }
      
      // Create and save message
      const message = new Message({
        sender: socket.user.id,
        content,
        conversation: conversationId,
        attachments: attachments || [],
        readBy: [socket.user.id]
      });
      
      await message.save();
      
      // Update conversation last message and update time
      conversation.lastMessage = message._id;
      
      // Update unread count for recipients
      const recipients = conversation.participants.filter(
        participant => participant.toString() !== socket.user.id
      );
      
      recipients.forEach((recipient) => {
        const recipientId = recipient.toString();
        const currentCount = conversation.unreadCount.get(recipientId) || 0;
        conversation.unreadCount.set(recipientId, currentCount + 1);
      });
      
      await conversation.save();
      
      // Fetch sender info
      await message.populate({
        path: 'sender',
        select: 'username avatar'
      });
      
      // Emit message to conversation room
      io.to(`conversation:${conversationId}`).emit('message:new', {
        message: {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          conversation: message.conversation,
          attachments: message.attachments,
          readBy: message.readBy,
          createdAt: message.createdAt
        },
        conversationId
      });
      
      // Create notifications for recipients
      for (const recipient of recipients) {
        // Create notification
        const notification = new Notification({
          recipient,
          sender: socket.user.id,
          type: 'message',
          title: 'New Message',
          content: `${socket.user.username} sent you a message`,
          relatedTo: {
            model: 'Message',
            id: message._id
          }
        });
        
        await notification.save();
        
        // Emit notification to recipient
        io.to(recipient.toString()).emit('notification:new', {
          notification: {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            sender: {
              _id: socket.user.id,
              username: socket.user.username,
              avatar: socket.user.avatar
            },
            createdAt: notification.createdAt
          }
        });
      }
    } catch (error) {
      console.error('Error handling private message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  /**
   * New group message event
   */
  socket.on('message:group', async (data) => {
    try {
      const { groupId, content, attachments } = data;
      
      // Validate required fields
      if (!groupId || !content) {
        socket.emit('error', { message: 'Group ID and content are required' });
        return;
      }
      
      // Check if group exists
      const group = await Group.findById(groupId);
      
      if (!group) {
        socket.emit('error', { message: 'Group not found' });
        return;
      }
      
      // Check if user is a member of the group
      if (!group.members.includes(socket.user.id)) {
        socket.emit('error', { message: 'Not authorized to send messages to this group' });
        return;
      }
      
      // Create and save message
      const message = new Message({
        sender: socket.user.id,
        content,
        group: groupId,
        attachments: attachments || [],
        readBy: [socket.user.id]
      });
      
      await message.save();
      
      // Update group last message and update time
      group.lastMessage = message._id;
      
      // Update unread count for recipients
      const recipients = group.members.filter(
        member => member.toString() !== socket.user.id
      );
      
      recipients.forEach((recipient) => {
        const recipientId = recipient.toString();
        const currentCount = group.unreadCount.get(recipientId) || 0;
        group.unreadCount.set(recipientId, currentCount + 1);
      });
      
      await group.save();
      
      // Fetch sender info
      await message.populate({
        path: 'sender',
        select: 'username avatar'
      });
      
      // Emit message to group room
      io.to(`group:${groupId}`).emit('message:new', {
        message: {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          group: message.group,
          attachments: message.attachments,
          readBy: message.readBy,
          createdAt: message.createdAt
        },
        groupId
      });
      
      // Create notifications for group members
      for (const recipient of recipients) {
        // Create notification
        const notification = new Notification({
          recipient,
          sender: socket.user.id,
          type: 'message',
          title: `New Message in ${group.name}`,
          content: `${socket.user.username} sent a message in ${group.name}`,
          relatedTo: {
            model: 'Message',
            id: message._id
          }
        });
        
        await notification.save();
        
        // Emit notification to recipient
        io.to(recipient.toString()).emit('notification:new', {
          notification: {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            sender: {
              _id: socket.user.id,
              username: socket.user.username,
              avatar: socket.user.avatar
            },
            createdAt: notification.createdAt
          }
        });
      }
    } catch (error) {
      console.error('Error handling group message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  /**
   * Typing indicator event
   */
  socket.on('typing:start', (data) => {
    try {
      const { conversationId, groupId } = data;
      
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          user: {
            _id: socket.user.id,
            username: socket.user.username
          },
          isTyping: true,
          conversationId
        });
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:update', {
          user: {
            _id: socket.user.id,
            username: socket.user.username
          },
          isTyping: true,
          groupId
        });
      }
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  });
  
  /**
   * Typing stopped event
   */
  socket.on('typing:stop', (data) => {
    try {
      const { conversationId, groupId } = data;
      
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          user: {
            _id: socket.user.id,
            username: socket.user.username
          },
          isTyping: false,
          conversationId
        });
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:update', {
          user: {
            _id: socket.user.id,
            username: socket.user.username
          },
          isTyping: false,
          groupId
        });
      }
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });
  
  /**
   * Mark messages as read event
   */
  socket.on('message:read', async (data) => {
    try {
      const { messageIds, conversationId, groupId } = data;
      
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return;
      }
      
      // Mark messages as read in database
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          readBy: { $ne: socket.user.id }
        },
        {
          $addToSet: { readBy: socket.user.id }
        }
      );
      
      // Reset unread count
      if (conversationId) {
        await Conversation.findByIdAndUpdate(
          conversationId,
          { $set: { [`unreadCount.${socket.user.id}`]: 0 } }
        );
        
        // Emit read receipts to conversation
        io.to(`conversation:${conversationId}`).emit('message:read', {
          reader: socket.user.id,
          messageIds,
          conversationId
        });
      } else if (groupId) {
        await Group.findByIdAndUpdate(
          groupId,
          { $set: { [`unreadCount.${socket.user.id}`]: 0 } }
        );
        
        // Emit read receipts to group
        io.to(`group:${groupId}`).emit('message:read', {
          reader: socket.user.id,
          messageIds,
          groupId
        });
      }
    } catch (error) {
      console.error('Error handling message read:', error);
    }
  });
};

module.exports = messageHandlers;