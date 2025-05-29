const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

describe('Message Routes', () => {
  let token;
  let user1;
  let user2;
  let conversation;
  
  beforeAll(async () => {
    // Clear collections
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    
    // Create test users
    user1 = await User.create({
      username: 'user1',
      email: 'user1@example.com',
      password: 'Password123',
      isVerified: true
    });
    
    user2 = await User.create({
      username: 'user2',
      email: 'user2@example.com',
      password: 'Password123',
      isVerified: true
    });
    
    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user1@example.com',
        password: 'Password123'
      });
    
    token = loginRes.body.token;
    
    // Create a conversation
    conversation = await Conversation.create({
      participants: [user1._id, user2._id]
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
    server.close();
  });
  
  describe('POST /api/messages', () => {
    it('should send a new message', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Test message',
          conversationId: conversation._id
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Test message');
    });
    
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          conversationId: conversation._id
          // Missing content
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/messages', () => {
    it('should get messages for a conversation', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .query({
          type: 'conversation',
          id: conversation._id
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});