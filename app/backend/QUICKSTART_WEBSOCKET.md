# WebSocket Quick Start Guide

Get real-time features working in minutes!

## For Backend Developers

### Starting the Server

```bash
cd /home/user/earning/app/backend
npm run dev
```

The server will start with WebSocket enabled on the same port (default 3001).

### Emitting Events from Your Controllers

#### When Creating an Earning

```typescript
import { emitEarningCreated } from '../websocket/events/earnings.events';
import { sendSuccessNotification } from '../websocket/events/notifications.events';

// After creating the earning in the database
emitEarningCreated(userId, {
  id: earning.id,
  userId,
  platformId: earning.platformId,
  platform: earning.platform,
  date: earning.date.toISOString().split('T')[0],
  hours: earning.hours ? Number(earning.hours) : null,
  amount: Number(earning.amount),
  hourly_rate: earning.hours ? Number(earning.amount) / Number(earning.hours) : null,
  notes: earning.notes || undefined,
});

sendSuccessNotification(
  userId,
  'Earning Created',
  `New earning of ${earning.amount} added`
);
```

#### When Updating an Earning

```typescript
import { emitEarningUpdated } from '../websocket/events/earnings.events';
import { sendSuccessNotification } from '../websocket/events/notifications.events';

emitEarningUpdated(userId, {
  id: earningId,
  userId,
  changes: updateData,
  updatedAt: new Date().toISOString(),
});

sendSuccessNotification(userId, 'Earning Updated', 'Earning has been updated');
```

#### When Deleting an Earning

```typescript
import { emitEarningDeleted } from '../websocket/events/earnings.events';
import { sendSuccessNotification } from '../websocket/events/notifications.events';

emitEarningDeleted(userId, earningId);

sendSuccessNotification(userId, 'Earning Deleted', 'Earning has been deleted');
```

#### Sending Custom Notifications

```typescript
import {
  sendSuccessNotification,
  sendErrorNotification,
  sendInfoNotification,
  sendWarningNotification,
} from '../websocket/events/notifications.events';

// Success
sendSuccessNotification(userId, 'Title', 'Message');

// Error
sendErrorNotification(userId, 'Title', 'Message');

// Info
sendInfoNotification(userId, 'Title', 'Message');

// Warning
sendWarningNotification(userId, 'Title', 'Message');
```

### Adding WebSocket Events to Other Controllers

Follow the earnings controller pattern in `/home/user/earning/app/backend/src/controllers/earning.controller.ts`.

1. Import event functions at the top
2. After database operations, emit the appropriate event
3. Optionally send a notification

---

## For Frontend Developers

### Installation

First, install the Socket.io client library:

```bash
npm install socket.io-client
```

### Basic Setup

Create a custom hook to manage WebSocket connection:

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth'; // Your auth hook

export const useWebSocket = () => {
  const { token } = useAuth(); // Get JWT token
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef.current;
};
```

### Listen to Earnings Updates

```typescript
import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';

function EarningsPage() {
  const socket = useWebSocket();
  const [earnings, setEarnings] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // New earning created
    socket.on('earnings:new', (response) => {
      const { data } = response;
      setEarnings(prev => [data, ...prev]);
      showNotification('New Earning', 'A new earning was added!', 'success');
    });

    // Earning updated
    socket.on('earnings:updated', (response) => {
      const { data } = response;
      setEarnings(prev =>
        prev.map(e => e.id === data.id ? { ...e, ...data.changes } : e)
      );
      showNotification('Earning Updated', 'The earning has been updated', 'info');
    });

    // Earning deleted
    socket.on('earnings:deleted', (response) => {
      const { data } = response;
      setEarnings(prev => prev.filter(e => e.id !== data.id));
      showNotification('Earning Deleted', 'The earning has been removed', 'warning');
    });

    return () => {
      socket.off('earnings:new');
      socket.off('earnings:updated');
      socket.off('earnings:deleted');
    };
  }, [socket]);

  return (
    <div>
      {earnings.map(earning => (
        <div key={earning.id}>
          {earning.amount} - {earning.date}
        </div>
      ))}
    </div>
  );
}
```

### Listen to Notifications

```typescript
function NotificationCenter() {
  const socket = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (response) => {
      const { data } = response;

      // Add notification to UI
      setNotifications(prev => [data, ...prev]);

      // Remove after duration (if specified)
      if (data.duration) {
        setTimeout(() => {
          setNotifications(prev =>
            prev.filter(n => n.id !== data.id)
          );
        }, data.duration);
      }

      // Show toast/alert based on type
      showToast(data.title, data.message, data.type);
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id} className={`notification notification-${notif.type}`}>
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  );
}
```

### Real-Time Dashboard

```typescript
import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';

function Dashboard() {
  const socket = useWebSocket();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [latestEarnings, setLatestEarnings] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Update totals when new earning is added
    socket.on('earnings:new', (response) => {
      const { data } = response;
      setTotalEarnings(prev => prev + data.amount);
      setLatestEarnings(prev =>
        [data, ...prev].slice(0, 5) // Keep last 5
      );
    });

    // Update when earning is modified
    socket.on('earnings:updated', (response) => {
      const { data } = response;
      if (data.changes.amount) {
        // Recalculate totals
        loadDashboardData();
      }
    });

    // Update when earning is deleted
    socket.on('earnings:deleted', (response) => {
      const { data } = response;
      setLatestEarnings(prev =>
        prev.filter(e => e.id !== data.id)
      );
      loadDashboardData();
    });

    return () => {
      socket.off('earnings:new');
      socket.off('earnings:updated');
      socket.off('earnings:deleted');
    };
  }, [socket]);

  return (
    <div>
      <h2>Total Earnings: ${totalEarnings}</h2>
      <h3>Latest Earnings</h3>
      <ul>
        {latestEarnings.map(e => (
          <li key={e.id}>
            {e.platform.name}: ${e.amount} ({e.date})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Toast Notification Helper

```typescript
// utils/notifications.ts
export function showToast(title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') {
  // Use your toast library (react-toastify, react-hot-toast, etc.)
  const toastFn = {
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    info: (msg: string) => toast.info(msg),
    warning: (msg: string) => toast.warning(msg),
  }[type];

  toastFn(`${title}: ${message}`);
}
```

### Environment Setup

Add to your `.env.local` or `.env`:

```
REACT_APP_API_URL=http://localhost:3001
```

For production:

```
REACT_APP_API_URL=https://api.yourdomain.com
```

---

## Testing WebSocket Connection

### Using Browser Console

```javascript
// Connect to WebSocket manually
const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN_HERE' }
});

// Listen to events
socket.on('earnings:new', (data) => console.log('New earning:', data));
socket.on('notification', (data) => console.log('Notification:', data));

// Emit test event
socket.emit('earnings:subscribe');

// Disconnect
socket.disconnect();
```

### Using curl to test HTTP endpoint

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.token')

# Use token in WebSocket connection
```

---

## Common Issues

### "Authentication token required"
- Ensure you're passing the JWT token in the handshake auth
- Check that the token is valid and not expired

### Events not received
- Check browser DevTools Network tab for WebSocket connection
- Verify you're listening to correct event names
- Check that socket is connected before emitting

### Connection keeps dropping
- Check network firewall rules
- Verify server is running
- Check logs for errors

### See detailed debugging guide in `WEBSOCKET_GUIDE.md`

---

## API Reference Quick Links

- Earnings Events: `src/websocket/events/earnings.events.ts`
- Notification Events: `src/websocket/events/notifications.events.ts`
- Utilities: `src/utils/websocket.util.ts`
- Full Guide: `WEBSOCKET_GUIDE.md`
- Implementation Details: `WEBSOCKET_IMPLEMENTATION_SUMMARY.md`
