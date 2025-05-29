const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');
const messageHandlers = require('./messageHandlers');
const presenceHandlers = require('./presenceHandlers');

/**
 * Socket.IO Manager for handling real-time connection and events
 * @param {Object} io - Socket.IO instance
 */
const socketManager = (io) => {
  // Map to track user socket connections
  const userSockets = new Map();
  
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user data to socket
      socket.user = {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });
  
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user.id})`);
    
    // Add socket to user's room (for private messages)
    socket.join(socket.user.id);
    
    // Add user to userSockets map
    if (!userSockets.has(socket.user.id)) {
      userSockets.set(socket.user.id, new Set());
    }
    userSockets.get(socket.user.id).add(socket.id);
    
    // Update user status to online
    await User.findByIdAndUpdate(
      socket.user.id,
      { 
        status: 'online',
        lastSeen: new Date()
      }
    );
    
    // Emit user online status to friends
    const user = await User.findById(socket.user.id).populate('friends', '_id');
    
    if (user && user.friends) {
      user.friends.forEach(friend => {
        io.to(friend._id.toString()).emit('user:status', {
          userId: socket.user.id,
          status: 'online',
          lastSeen: new Date()
        });
      });
    }
    
    // Join rooms for all user's conversations and groups
    const conversations = await Conversation.find({
      participants: socket.user.id,
      isActive: true
    });
    
    conversations.forEach(conversation => {
      socket.join(`conversation:${conversation._id}`);
    });
    
    const groups = await Group.find({
      members: socket.user.id,
      isActive: true
    });
    
    groups.forEach(group => {
      socket.join(`group:${group._id}`);
    });
    
    // Setup message handlers
    messageHandlers(io, socket, userSockets);
    
    // Setup presence handlers
    presenceHandlers(io, socket, userSockets);
    
    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.user.id})`);
      
      // Remove socket from user's sockets set
      if (userSockets.has(socket.user.id)) {
        userSockets.get(socket.user.id).delete(socket.id);
        
        // If no more sockets for this user, remove from map and update status
        if (userSockets.get(socket.user.id).size === 0) {
          userSockets.delete(socket.user.id);
          
          // Update user status to offline
          await User.findByIdAndUpdate(
            socket.user.id,
            { 
              status: 'offline',
              lastSeen: new Date()
            }
          );
          
          // Notify friends about offline status
          if (user && user.friends) {
            user.friends.forEach(friend => {
              io.to(friend._id.toString()).emit('user:status', {
                userId: socket.user.id,
                status: 'offline',
                lastSeen: new Date()
              });
            });
          }
        }
      }
    });
  });
};

module.exports = socketManager;