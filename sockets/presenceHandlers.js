const User = require('../models/User');

/**
 * Socket handlers for user presence events
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Client socket
 * @param {Map} userSockets - Map of user IDs to socket IDs
 */
const presenceHandlers = (io, socket, userSockets) => {
  /**
   * Status change event
   */
  socket.on('status:change', async (data) => {
    try {
      const { status } = data;
      
      if (!['online', 'offline', 'away', 'busy'].includes(status)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }
      
      // Update user status in database
      await User.findByIdAndUpdate(
        socket.user.id,
        { 
          status,
          lastSeen: new Date()
        }
      );
      
      // Get user's friends to notify
      const user = await User.findById(socket.user.id).populate('friends', '_id');
      
      if (user && user.friends) {
        // Notify friends about status change
        user.friends.forEach(friend => {
          io.to(friend._id.toString()).emit('user:status', {
            userId: socket.user.id,
            status,
            lastSeen: new Date()
          });
        });
      }
      
      // Confirm status change to the user
      socket.emit('status:updated', { status });
    } catch (error) {
      console.error('Error handling status change:', error);
      socket.emit('error', { message: 'Failed to update status' });
    }
  });
  
  /**
   * Request users status
   */
  socket.on('status:get', async (data) => {
    try {
      const { userIds } = data;
      
      if (!userIds || !Array.isArray(userIds)) {
        socket.emit('error', { message: 'Invalid user IDs' });
        return;
      }
      
      // Get status for requested users
      const users = await User.find(
        { _id: { $in: userIds } },
        'status lastSeen'
      );
      
      const statusMap = {};
      users.forEach(user => {
        statusMap[user._id.toString()] = {
          status: user.status,
          lastSeen: user.lastSeen
        };
      });
      
      socket.emit('status:list', statusMap);
    } catch (error) {
      console.error('Error fetching user statuses:', error);
      socket.emit('error', { message: 'Failed to fetch user statuses' });
    }
  });
  
  /**
   * Online presence ping (keeps session alive)
   */
  socket.on('presence:ping', async () => {
    try {
      // Update last seen timestamp without changing status
      await User.findByIdAndUpdate(
        socket.user.id,
        { lastSeen: new Date() }
      );
    } catch (error) {
      console.error('Error updating presence ping:', error);
    }
  });
  
  /**
   * Get presence history (when user was last online)
   */
  socket.on('presence:history', async (data) => {
    try {
      const { userId } = data;
      
      if (!userId) {
        socket.emit('error', { message: 'User ID is required' });
        return;
      }
      
      const user = await User.findById(userId, 'status lastSeen');
      
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      socket.emit('presence:history', {
        userId,
        status: user.status,
        lastSeen: user.lastSeen
      });
    } catch (error) {
      console.error('Error fetching presence history:', error);
      socket.emit('error', { message: 'Failed to fetch presence history' });
    }
  });
};

module.exports = presenceHandlers;