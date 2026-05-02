# Real-Time Chat Implementation

The chat module now supports **real-time WebSocket communication** for instant message delivery.

## Architecture

- **REST API**: For creating conversations, fetching message history, and marking messages as read
- **WebSocket (Socket.io)**: For real-time message delivery, typing indicators, and read receipts

## WebSocket Connection

### Server Details
- **Namespace**: `/chat`
- **URL**: `ws://localhost:3000/chat` (or your server URL)
- **Authentication**: JWT token required

### Client-Side Connection Examples

#### JavaScript/TypeScript (Browser or Node.js)

```typescript
import { io } from 'socket.io-client';

// Connect to the chat namespace with JWT token
const socket = io('ws://localhost:3000/chat', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

#### React Example

```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function ChatComponent({ conversationId, jwtToken }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('ws://localhost:3000/chat', {
      auth: { token: jwtToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected');
      // Join the conversation room
      newSocket.emit('join_conversation', { conversationId });
    });

    // Listen for new messages
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    newSocket.on('user_typing', ({ userId, isTyping }) => {
      console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
    });

    // Listen for read receipts
    newSocket.on('messages_read', ({ userId, readAt }) => {
      console.log(`Messages read by ${userId} at ${readAt}`);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.emit('leave_conversation', { conversationId });
      newSocket.disconnect();
    };
  }, [conversationId, jwtToken]);

  const sendMessage = (content: string) => {
    // Send via REST API (which will emit to WebSocket)
    fetch(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ content })
    });
  };

  const handleTyping = (isTyping: boolean) => {
    socket?.emit('typing', { conversationId, isTyping });
  };

  return (
    <div>
      {/* Your chat UI here */}
    </div>
  );
}
```

## WebSocket Events

### Client → Server

#### `join_conversation`
Join a conversation room to receive real-time updates.

```typescript
socket.emit('join_conversation', { 
  conversationId: 'conversation-uuid' 
});
```

**Response:**
```json
{
  "success": true,
  "conversationId": "conversation-uuid"
}
```

#### `leave_conversation`
Leave a conversation room.

```typescript
socket.emit('leave_conversation', { 
  conversationId: 'conversation-uuid' 
});
```

#### `typing`
Send typing indicator to other participants.

```typescript
socket.emit('typing', { 
  conversationId: 'conversation-uuid',
  isTyping: true 
});
```

### Server → Client

#### `new_message`
Received when a new message is sent in the conversation.

```typescript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // message structure:
  // {
  //   id: string,
  //   conversationId: string,
  //   senderId: string,
  //   content: string,
  //   type: 'TEXT',
  //   isRead: false,
  //   createdAt: Date,
  //   sender: { id, firstName, lastName }
  // }
});
```

#### `user_typing`
Received when another user is typing.

```typescript
socket.on('user_typing', ({ userId, conversationId, isTyping }) => {
  if (isTyping) {
    // Show "User is typing..." indicator
  } else {
    // Hide typing indicator
  }
});
```

#### `messages_read`
Received when the other participant marks messages as read.

```typescript
socket.on('messages_read', ({ userId, readAt }) => {
  // Update UI to show messages have been read
  console.log(`Messages read by ${userId} at ${readAt}`);
});
```

## REST API Integration

The WebSocket system works alongside the REST API:

1. **Send Message**: Use REST API POST `/chat/conversations/:id/messages`
   - The server will automatically emit the message via WebSocket to all participants
   
2. **Fetch History**: Use REST API GET `/chat/conversations/:id/messages?page=1&limit=50`
   - Load initial messages and pagination
   
3. **Mark as Read**: Use REST API PATCH `/chat/conversations/:id/read`
   - Server emits `messages_read` event via WebSocket

## Complete Workflow Example

```typescript
// 1. Initialize connection
const socket = io('ws://localhost:3000/chat', {
  auth: { token: userJwtToken }
});

// 2. Join conversation
socket.on('connect', () => {
  socket.emit('join_conversation', { conversationId });
});

// 3. Listen for new messages
socket.on('new_message', (message) => {
  appendMessageToUI(message);
  
  // Mark as read if conversation is active
  if (conversationIsVisible) {
    markAsRead(conversationId);
  }
});

// 4. Send message via REST API
async function sendMessage(content: string) {
  const response = await fetch(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ content })
  });
  
  // Message will be delivered to all participants via WebSocket
}

// 5. Handle typing indicator
let typingTimeout: NodeJS.Timeout;
messageInput.addEventListener('input', () => {
  socket.emit('typing', { conversationId, isTyping: true });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { conversationId, isTyping: false });
  }, 2000);
});

// 6. Cleanup on unmount
window.addEventListener('beforeunload', () => {
  socket.emit('leave_conversation', { conversationId });
  socket.disconnect();
});
```

## Security

- **Authentication**: JWT token required for WebSocket connection
- **Authorization**: Users can only join conversations they are part of (participant or group admin)
- **Room Isolation**: Each conversation has its own room, messages only sent to authorized participants

## Production Configuration

Update CORS settings in `chat.gateway.ts` for production:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL, // Set your frontend URL
    credentials: true,
  },
  namespace: '/chat',
})
```

## Testing WebSocket Connection

You can test the WebSocket connection using the Socket.io client:

```bash
npm install -g wscat
wscat -c "ws://localhost:3000/chat?token=YOUR_JWT_TOKEN"
```

Or use Postman's WebSocket feature to test the connection.
