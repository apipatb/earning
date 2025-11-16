# WebSocket Implementation Guide

This document describes the Socket.io WebSocket implementation for real-time features in the EarnTrack backend.

## Overview

The WebSocket system enables real-time communication between the server and clients for:
- Earnings updates (create, update, delete)
- User notifications (info, success, warning, error)
- Real-time dashboard updates

## Architecture

### Core Components

1. **WebSocket Server** (`src/websocket/ws.ts`)
   - Socket.io server initialization
   - Connection/disconnection handling
   - Logging and monitoring

2. **Authentication Middleware** (`src/middleware/ws-auth.middleware.ts`)
   - JWT token validation on connection
   - User authentication verification
   - Security token extraction from handshake

3. **Event Handlers**
   - **Earnings Events** (`src/websocket/events/earnings.events.ts`)
     - `earnings:new` - New earning created
     - `earnings:updated` - Earning modified
     - `earnings:deleted` - Earning removed

   - **Notification Events** (`src/websocket/events/notifications.events.ts`)
     - `notification` - Send notification to user
     - `notification:broadcast` - Broadcast to all users

4. **Utilities** (`src/utils/websocket.util.ts`)
   - Helper functions for emitting events
   - User connection management
   - Room-based broadcasting

## Implementation Details

### Server Setup

The WebSocket server is initialized in `src/server.ts`:

```typescript
import http from 'http';
import { initializeWebSocket } from './websocket/ws';
import { wsAuthMiddleware } from './middleware/ws-auth.middleware';
import { setupEarningsEvents } from './websocket/events/earnings.events';
import { setupNotificationEvents } from './websocket/events/notifications.events';

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(server, corsOptions);

// Apply authentication middleware
io.use(wsAuthMiddleware);

// Setup event handlers
io.on('connection', (socket) => {
  setupEarningsEvents(socket);
  setupNotificationEvents(socket);
});

// Start server
server.listen(PORT, () => {
  logInfo('Server started', { websocket: 'enabled' });
});
```

### Authentication Flow

1. Client connects with JWT token in handshake auth
2. `wsAuthMiddleware` verifies the token using `verifyToken()` from JWT utils
3. User ID and email are attached to socket handshake
4. Subsequent event handlers access user info via `socket.handshake.auth`

### Room Structure

Users are automatically joined to user-specific rooms:

- **Earnings Room**: `earnings:{userId}` - Receives earnings updates
- **Notifications Room**: `notifications:{userId}` - Receives notifications

This ensures each user only receives their own data.

## API Reference

### Earnings Events

#### Emit New Earning (Server → Client)

**Event**: `earnings:new`

```typescript
// From controller after creating an earning
emitEarningCreated(userId, {
  id: earning.id,
  userId,
  platformId: earning.platformId,
  platform: earning.platform,
  date: "2024-01-15",
  hours: 8,
  amount: 100,
  hourly_rate: 12.5,
  notes: "Optional note"
});
```

**Client Receipt**:
```javascript
socket.on('earnings:new', (response) => {
  const { event, timestamp, data } = response;
  // Update UI with new earning
});
```

#### Emit Updated Earning (Server → Client)

**Event**: `earnings:updated`

```typescript
emitEarningUpdated(userId, {
  id: earningId,
  userId,
  changes: {
    amount: 120,
    hours: 10
  },
  updatedAt: new Date().toISOString()
});
```

**Client Receipt**:
```javascript
socket.on('earnings:updated', (response) => {
  const { event, timestamp, data } = response;
  // Update earning in UI
});
```

#### Emit Deleted Earning (Server → Client)

**Event**: `earnings:deleted`

```typescript
emitEarningDeleted(userId, earningId);
```

**Client Receipt**:
```javascript
socket.on('earnings:deleted', (response) => {
  const { event, timestamp, data } = response;
  const earningId = data.id;
  // Remove earning from UI
});
```

### Notification Events

#### Send User Notification

**Event**: `notification`

```typescript
import { sendSuccessNotification, sendErrorNotification, sendInfoNotification } from './websocket/events/notifications.events';

// Success notification
sendSuccessNotification(
  userId,
  'Earning Created',
  'New earning of $100 added to Upwork'
);

// Error notification
sendErrorNotification(
  userId,
  'Error',
  'Failed to create earning'
);

// Info notification
sendInfoNotification(
  userId,
  'Info',
  'Earnings summary updated'
);
```

**Client Receipt**:
```javascript
socket.on('notification', (response) => {
  const { data } = response;
  // {
  //   id: "notif_...",
  //   title: "Earning Created",
  //   message: "New earning of $100 added to Upwork",
  //   type: "success",
  //   timestamp: "2024-01-15T10:30:00.000Z",
  //   dismissible: true,
  //   duration: 5000
  // }
  showNotification(data);
});
```

#### Broadcast Notification

```typescript
import { broadcastNotification } from './websocket/events/notifications.events';

broadcastNotification({
  id: 'notif_' + Date.now(),
  title: 'Server Maintenance',
  message: 'Server will be down for 5 minutes',
  type: 'info',
  timestamp: new Date().toISOString()
});
```

## Controller Integration

### Example: Earnings Controller

```typescript
import {
  emitEarningCreated,
  emitEarningUpdated,
  emitEarningDeleted
} from '../websocket/events/earnings.events';
import { sendSuccessNotification } from '../websocket/events/notifications.events';

export const createEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    // ... validation and database logic ...

    const earning = await prisma.earning.create({
      // ... data ...
    });

    // Emit WebSocket event
    emitEarningCreated(userId, earningData);

    // Send notification
    sendSuccessNotification(
      userId,
      'Earning Created',
      `New earning of ${earning.amount} added`
    );

    res.status(201).json({ earning });
  } catch (error) {
    // ... error handling ...
  }
};
```

## Frontend Integration

### React Hook Example

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export const useWebSocket = () => {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current = socket;
  }, [token]);

  useEffect(() => {
    if (token) {
      connect();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, connect]);

  return socketRef.current;
};
```

### Usage in Component

```typescript
function EarningsPage() {
  const socket = useWebSocket();
  const [earnings, setEarnings] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Listen to new earnings
    socket.on('earnings:new', (response) => {
      setEarnings(prev => [response.data, ...prev]);
    });

    // Listen to earning updates
    socket.on('earnings:updated', (response) => {
      setEarnings(prev =>
        prev.map(e => e.id === response.data.id ? { ...e, ...response.data.changes } : e)
      );
    });

    // Listen to earning deletions
    socket.on('earnings:deleted', (response) => {
      setEarnings(prev => prev.filter(e => e.id !== response.data.id));
    });

    // Listen to notifications
    socket.on('notification', (response) => {
      showNotification(response.data);
    });

    return () => {
      socket.off('earnings:new');
      socket.off('earnings:updated');
      socket.off('earnings:deleted');
      socket.off('notification');
    };
  }, [socket]);

  return (
    // ... render earnings
  );
}
```

## Utility Functions

### `emitToUser(userId, event, data)`

Emit event to specific user:

```typescript
import { emitToUser } from '../utils/websocket.util';

emitToUser(userId, 'custom:event', { message: 'Hello' });
```

### `emitToRoom(room, event, data)`

Emit event to specific room:

```typescript
import { emitToRoom } from '../utils/websocket.util';

emitToRoom('earnings:user123', 'earnings:sync', { /* data */ });
```

### `broadcastEvent(event, data)`

Broadcast to all connected clients:

```typescript
import { broadcastEvent } from '../utils/websocket.util';

broadcastEvent('server:announcement', { message: 'Maintenance scheduled' });
```

### `getConnectedUsers()`

Get list of connected user IDs:

```typescript
import { getConnectedUsers } from '../utils/websocket.util';

const users = getConnectedUsers();
console.log('Connected users:', users);
```

### `getUserSocketCount(userId)`

Get number of active sockets for a user:

```typescript
import { getUserSocketCount } from '../utils/websocket.util';

const count = getUserSocketCount(userId);
```

### `disconnectUser(userId)`

Disconnect all sockets for a user (useful for logout):

```typescript
import { disconnectUser } from '../utils/websocket.util';

disconnectUser(userId); // Disconnect on logout
```

## Logging

All WebSocket events are logged using the Winston logger:

- Connection/disconnection events
- Authentication successes/failures
- Event emissions
- Error conditions

View logs in:
- Console (development)
- `logs/combined-YYYY-MM-DD.log` (all events)
- `logs/error-YYYY-MM-DD.log` (errors only)

## Security

1. **JWT Authentication**: All WebSocket connections require valid JWT tokens
2. **User Isolation**: Rooms are user-specific; users only receive their own data
3. **Token Verification**: Tokens are verified on connection and must be valid
4. **CORS Support**: WebSocket respects CORS settings from main server
5. **Rate Limiting**: Consider implementing WebSocket rate limiting for production

## Performance Considerations

- WebSocket uses long-polling fallback for compatibility
- Default ping/pong interval: 25 seconds
- Max buffer size: 1MB per message
- Reconnection with exponential backoff (default)

## Troubleshooting

### Connection Issues

```javascript
// Enable debug logging on client
localStorage.debug = 'socket.io-client:socket';
```

### Common Errors

1. **"Authentication token required"** - Client not sending JWT token
2. **"Invalid or expired token"** - JWT token expired or invalid
3. **Connection timeout** - Check network/firewall settings
4. **Event not received** - Verify user ID in room matches sender

## Future Enhancements

- WebSocket rate limiting
- Message batching for high-frequency updates
- Offline queue for disconnected clients
- Compression for large messages
- Redis adapter for multi-server setups
- Transaction/conflict resolution for offline edits
