# 📦 Real-time chat application backend REST API

A comprehensive real-time chat application backend built with Node.js, Express, MongoDB, and Socket.IO. This backend provides secure REST APIs, real-time messaging, authentication, email verification, and robust user management features.

## 🚀 Features

- 🔐 **JWT Authentication** with refresh tokens and email verification
- 💬 **Real-time messaging** using Socket.IO for private and group chats
- 👥 **Friend system** with friend requests and management
- 📩 **Email verification** and password reset via Nodemailer
- 📁 **File uploads** with Multer for attachments
- 📊 **API documentation** via Swagger
- 🔒 **Security** with rate limiting and security headers (Helmet)
- ✅ **Comprehensive test coverage** with Jest + Supertest
- 🎯 **User presence** tracking (online, offline, away, busy)
- 🔔 **Real-time notifications** system
- 📱 **Typing indicators** and read receipts

## 🛠️ Tech Stack

- **Runtime**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **Documentation**: Swagger
- **Testing**: Jest + Supertest
- **Security**: Helmet, Express Rate Limit

## 📁 Project Structure

```
chat-app-backend/
├── server.js                    # Main server entry point
├── routes/                      # API route definitions
│   ├── authRoutes.js           # Authentication routes
│   ├── userRoutes.js           # User management routes
│   ├── messageRoutes.js        # Message handling routes
│   ├── conversationRoutes.js   # Conversation management
│   └── groupRoutes.js          # Group chat routes
├── controllers/                 # Business logic controllers
│   ├── authController.js       # Authentication logic
│   ├── userController.js       # User management logic
│   ├── messageController.js    # Message handling logic
│   ├── conversationController.js
│   └── groupController.js
├── models/                      # Database models
│   ├── User.js                 # User model
│   ├── Message.js              # Message model
│   ├── Conversation.js         # Conversation model
│   ├── Group.js                # Group model
│   └── Notification.js         # Notification model
├── middlewares/                 # Custom middleware
│   ├── authMiddleware.js       # Authentication middleware
│   ├── errorMiddleware.js      # Error handling
│   ├── rateLimitMiddleware.js  # Rate limiting
│   └── validationMiddleware.js # Input validation
├── sockets/                     # Socket.IO handlers
│   └── socketManager.js        # Socket connection management
├── services/                    # External services
│   └── emailService.js         # Email sending service
├── utils/                       # Utility functions
│   └── helpers.js              # Helper functions
├── config/                      # Configuration files
│   └── swagger.js              # Swagger documentation config
├── tests/                       # Test files
│   ├── auth.test.js            # Authentication tests
│   └── messages.test.js        # Message tests
├── .env.example                # Environment variables template
├── package.json
└── README.md
```

## 🗄️ Database Models & Relationships

### Model Relationships Diagram

```
User ────────────────── Conversation ────────────────── Message
 │                           │                           │
 │                           │                           │
 ├─── friends []             └── participants [2]        ├── sender
 ├─── friendRequests []                                   ├── conversation
 └─── Notification                                        └── attachments []
      │
      └── recipient/sender
                                Group ────────────────── Message
                                 │                        │
                                 ├── creator              ├── sender
                                 ├── members []           └── group
                                 ├── admins []
                                 └── lastMessage
```

### User Model

The central model representing users in the chat application.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated unique identifier |
| `username` | String | Unique username (3-30 characters) |
| `email` | String | Unique email address with validation |
| `password` | String | Hashed password (bcrypt, hidden by default) |
| `avatar` | String | URL for user's profile picture |
| `status` | String | User status: `online`, `offline`, `away`, `busy` |
| `isVerified` | Boolean | Email verification status |
| `verificationToken` | String | Token for email verification |
| `resetPasswordToken` | String | Token for password reset |
| `resetPasswordExpires` | Date | Expiration time for reset token |
| `friends` | [ObjectId] | Array of friend user IDs |
| `friendRequests` | [{from: ObjectId, status: String}] | Pending friend requests |
| `preferences` | Object | User settings (theme, notifications) |
| `lastSeen` | Date | Last activity timestamp |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last update timestamp |

**Key Methods:**
- Password hashing before save (pre-save middleware)
- Password comparison method
- JWT token generation (auth & refresh tokens)

### Message Model

Represents individual messages in conversations or groups.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated unique identifier |
| `sender` | ObjectId | Reference to User who sent the message |
| `content` | String | Message text content (max 1000 characters) |
| `conversation` | ObjectId | Reference to Conversation (for private chats) |
| `group` | ObjectId | Reference to Group (for group chats) |
| `readBy` | [ObjectId] | Array of user IDs who have read this message |
| `attachments` | [{type, url, filename, size}] | File attachments |
| `isDeleted` | Boolean | Soft delete flag |
| `createdAt` | Date | Message creation timestamp |
| `updatedAt` | Date | Message update timestamp |

**Validation:** A message must belong to exactly one of either a conversation or a group.

### Conversation Model

Represents one-to-one chat sessions between two users.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated unique identifier |
| `participants` | [ObjectId] | Exactly 2 user references |
| `lastMessage` | ObjectId | Reference to the most recent message |
| `unreadCount` | Map<ObjectId, Number> | Unread message count per participant |
| `isActive` | Boolean | Conversation active status |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

**Validation:** Must have exactly two participants.

### Group Model

Represents group chat rooms with multiple members.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated unique identifier |
| `name` | String | Group name (3-50 characters) |
| `description` | String | Optional group description (max 200 chars) |
| `creator` | ObjectId | Reference to User who created the group |
| `members` | [ObjectId] | Array of group member user IDs |
| `admins` | [ObjectId] | Array of admin user IDs |
| `avatar` | String | Group avatar image URL |
| `lastMessage` | ObjectId | Reference to the last message |
| `unreadCount` | Map<ObjectId, Number> | Unread count per user |
| `isActive` | Boolean | Group active status |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

**Business Rules:**
- Creator is automatically added as admin and member
- Group must have at least one admin
- Admins can manage members and group settings

### Notification Model

Represents system notifications sent to users.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated unique identifier |
| `recipient` | ObjectId | User receiving the notification |
| `sender` | ObjectId | User who triggered the notification |
| `type` | String | `message`, `friend_request`, `group_invitation`, `system` |
| `title` | String | Notification title |
| `content` | String | Optional notification content |
| `relatedTo` | {model: String, id: ObjectId} | Reference to related entity |
| `isRead` | Boolean | Read status flag |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Update timestamp |

## 🔧 Middleware System

### Authentication Middleware

**`protect`** - JWT Token Verification
- Verifies JWT token from Authorization header
- Loads user from database (excludes password)
- Checks if user email is verified
- Attaches user object to `req.user`
- Returns 401 for invalid/expired tokens

**`admin`** - Admin Authorization
- Ensures authenticated user has admin role
- Returns 403 if user is not an admin

### Error Handling Middleware

**`ApiError` Class**
- Custom error class extending Error
- Contains HTTP status code
- Standardizes error responses

**`errorHandler`**
- Catches all application errors
- Logs error details
- Returns JSON error response
- Shows stack trace in development mode

**`asyncHandler`**
- Wraps async route handlers
- Automatically forwards errors to error handler
- Eliminates need for try/catch blocks

### Rate Limiting Middleware

**`apiLimiter`**
- Limits general API requests to 100 per 15 minutes per IP
- Returns friendly JSON error message when exceeded

**`authLimiter`**
- Stricter limits for authentication routes
- 10 requests per hour per IP for login/password reset
- Prevents brute force attacks

### Validation Middleware

Uses `express-validator` for input validation:

- `registerValidation` - User registration inputs
- `loginValidation` - User login inputs
- `resetRequestValidation` - Password reset email requests
- `resetPasswordValidation` - New password validation
- `messageValidation` - Message content validation
- `groupValidation` - Group creation validation

## 🌐 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Access | Middleware | Description |
|--------|----------|--------|------------|-------------|
| POST | `/register` | Public | `registerValidation`, `validateRequest` | Register new user account |
| POST | `/login` | Public | `authLimiter`, `loginValidation`, `validateRequest` | User login with email/password |
| POST | `/logout` | Private | `protect` | Logout current user |
| GET | `/verify-email/:token` | Public | None | Verify user email with token |
| POST | `/forgot-password` | Public | `resetRequestValidation`, `validateRequest` | Request password reset email |
| PUT | `/reset-password/:token` | Public | `resetPasswordValidation`, `validateRequest` | Reset password using token |
| POST | `/refresh-token` | Public | None | Refresh JWT access token |
| GET | `/me` | Private | `protect` | Get current user profile |

### User Management Routes (`/api/users`)

| Method | Endpoint | Access | Middleware | Description |
|--------|----------|--------|------------|-------------|
| GET | `/` | Private | `protect` | Get all users (paginated, searchable) |
| GET | `/:id` | Private | `protect` | Get specific user by ID |
| PUT | `/profile` | Private | `protect` | Update user profile |
| PUT | `/change-password` | Private | `protect` | Change user password |
| PUT | `/status` | Private | `protect` | Update online status |
| GET | `/friends` | Private | `protect` | Get user's friends list |
| GET | `/friend-requests` | Private | `protect` | Get pending friend requests |
| POST | `/:id/friend-request` | Private | `apiLimiter`, `protect` | Send friend request |
| PUT | `/friend-request/:id` | Private | `protect` | Accept/reject friend request |
| DELETE | `/friends/:id` | Private | `protect` | Remove friend |

### Conversation Routes (`/api/conversations`)

| Method | Endpoint | Access | Middleware | Description |
|--------|----------|--------|------------|-------------|
| GET | `/` | Private | `protect` | Get user's conversations |
| POST | `/` | Private | `protect` | Create new conversation |
| GET | `/:id` | Private | `protect` | Get conversation details |
| DELETE | `/:id` | Private | `protect` | Delete conversation |

### Group Routes (`/api/groups`)

| Method | Endpoint | Access | Middleware | Description |
|--------|----------|--------|------------|-------------|
| GET | `/` | Private | `protect` | Get user's groups |
| POST | `/` | Private | `groupValidation`, `validateRequest`, `protect` | Create new group |
| GET | `/:id` | Private | `protect` | Get group details |
| PUT | `/:id` | Private | `protect` | Update group information |
| PUT | `/:id/members` | Private | `protect` | Add members to group |
| DELETE | `/:id/members/:userId` | Private | `protect` | Remove member from group |
| PUT | `/:id/admins/:userId` | Private | `protect` | Promote member to admin |
| DELETE | `/:id/admins/:userId` | Private | `protect` | Demote admin |
| POST | `/:id/leave` | Private | `protect` | Leave group |
| DELETE | `/:id` | Private | `protect` | Delete group |

### Message Routes (`/api/messages`)

| Method | Endpoint | Access | Middleware | Description |
|--------|----------|--------|------------|-------------|
| POST | `/` | Private | `messageValidation`, `validateRequest`, `apiLimiter`, `protect` | Send message |
| GET | `/` | Private | `protect` | Get messages (by conversation/group) |
| DELETE | `/:id` | Private | `protect` | Delete message |
| PUT | `/read` | Private | `protect` | Mark messages as read |

## 🔌 Real-Time Features (Socket.IO)

### Socket Authentication
- JWT token required in socket handshake
- User data attached to socket after authentication
- Automatic room joining for user's conversations and groups

### Message Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `message:private` | Client → Server | `{conversationId, content, attachments?}` | Send private message |
| `message:group` | Client → Server | `{groupId, content, attachments?}` | Send group message |
| `message:new` | Server → Client | `{message, conversation/group}` | New message received |
| `message:read` | Client → Server | `{messageIds[], conversationId?, groupId?}` | Mark messages as read |
| `typing:start` | Client → Server | `{conversationId?, groupId?}` | Start typing indicator |
| `typing:stop` | Client → Server | `{conversationId?, groupId?}` | Stop typing indicator |
| `typing:update` | Server → Client | `{userId, typing, conversationId?, groupId?}` | Typing status update |

### Presence Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `status:change` | Client → Server | `{status: 'online'|'offline'|'away'|'busy'}` | Change user status |
| `status:updated` | Server → Client | `{status}` | Status change confirmation |
| `user:status` | Server → Client | `{userId, status, lastSeen}` | Friend status update |
| `status:get` | Client → Server | `{userIds: []}` | Get multiple user statuses |
| `status:list` | Server → Client | `[{userId, status, lastSeen}]` | Status list response |
| `presence:ping` | Client → Server | `{}` | Keep session alive |
| `presence:history` | Client → Server | `{userId}` | Get user presence history |

### Notification Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification:new` | Server → Client | `{notification}` | New notification received |

## 🏗️ Controllers Overview

### Auth Controller (`authController.js`)

Handles all authentication-related operations:

**`register`**
- Validates user input
- Checks for existing username/email
- Hashes password using bcrypt
- Creates verification token
- Sends verification email
- Returns success message

**`login`**
- Validates credentials
- Checks email verification status
- Compares password hash
- Updates user status to online
- Generates JWT access and refresh tokens
- Returns tokens and user data

**`logout`**
- Updates user status to offline
- Records last seen timestamp
- Returns success message

**`verifyEmail`**
- Validates verification token
- Marks user as verified
- Clears verification token
- Returns success message

**`forgotPassword`**
- Validates email existence
- Generates secure reset token
- Sets token expiration (10 minutes)
- Sends reset email
- Returns success message

**`resetPassword`**
- Validates reset token and expiration
- Updates user password
- Clears reset token and expiration
- Returns success message

**`refreshToken`**
- Validates refresh token
- Generates new access token
- Returns new access token

**`getMe`**
- Returns current authenticated user data

### User Controller (`userController.js`)

Manages user profiles and social features:

**`getAllUsers`**
- Paginates user list
- Supports search by username/email
- Excludes current user
- Returns users with pagination info

**`getUserById`**
- Fetches user by ID
- Returns user profile data
- Handles user not found

**`updateProfile`**
- Updates user profile fields
- Validates input data
- Returns updated user data

**`changePassword`**
- Verifies current password
- Updates to new password
- Returns success message

**`sendFriendRequest`**
- Validates target user
- Checks existing friendship/request
- Creates friend request
- Sends notification
- Returns success message

**`respondToFriendRequest`**
- Validates request existence
- Handles accept/reject actions
- Updates friend lists for acceptance
- Creates notification
- Returns success message

**`getFriendRequests`**
- Returns pending friend requests
- Populates sender information

**`getFriends`**
- Returns user's friends list
- Includes online status

**`removeFriend`**
- Removes from both users' friend lists
- Returns success message

**`updateStatus`**
- Updates user online status
- Broadcasts to friends via socket
- Returns updated status

## 🔧 Services & Utilities

### Email Service (`emailService.js`)

**`sendVerificationEmail(email, token)`**
- Sends HTML email with verification link
- Link valid for 24 hours
- Uses configured SMTP settings

**`sendPasswordResetEmail(email, token)`**
- Sends HTML email with reset link
- Link valid for 10 minutes
- Includes security warnings

### Utility Functions (`utils/helpers.js`)

**`generateRandomString(length=20)`**
- Generates cryptographically secure random hex string
- Used for tokens and IDs

**`formatDate(date)`**
- Formats dates for display
- Returns human-readable format

**`timeAgo(date)`**
- Calculates relative time
- Returns "X minutes ago" format

**`sanitizeText(text)`**
- Escapes HTML characters
- Prevents XSS attacks

**`isValidEmail(email)`**
- Validates email format
- Returns boolean result

**`truncateText(text, maxLength=50)`**
- Truncates long text
- Adds ellipsis when truncated

## 🔒 Security Features

### Authentication Security
- JWT tokens with expiration
- Refresh token rotation
- Password hashing with bcrypt
- Email verification required
- Password reset tokens with expiration

### Rate Limiting
- API endpoint protection
- Authentication route limits
- Brute force prevention

### Input Validation
- Request payload validation
- SQL injection prevention
- XSS protection
- File upload restrictions

### Security Headers
- Helmet middleware for security headers
- CORS configuration
- Content Security Policy

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chat-app-backend.git
cd chat-app-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000

# Database configuration
MONGODB_URI=mongodb://localhost:27017/chatapp

# JWT configuration
JWT_SECRET=your_super_secure_jwt_secret
JWT_REFRESH_SECRET=your_super_secure_refresh_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Email configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com

# Frontend URL for email verification
FRONTEND_URL=http://localhost:3000
```

4. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📊 API Documentation

Access the Swagger documentation at: `http://localhost:3000/api-docs`

The documentation includes:
- All endpoint details
- Request/response schemas
- Authentication requirements
- Example requests and responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Ensure all tests pass

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- Socket.IO team for real-time capabilities
- MongoDB team for the database
- All open-source contributors

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: navnathvarade09@gmail.com
- Documentation: [API Docs](http://localhost:3000/api-docs)

---

**Built with ❤️ and Lots of coffee.**
