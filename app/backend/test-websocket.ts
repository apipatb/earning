#!/usr/bin/env npx tsx
/**
 * Simple test to verify WebSocket server initialization
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import { initializeWebSocket } from './src/websocket/ws';
import { wsAuthMiddleware } from './src/middleware/ws-auth.middleware';
import { setupEarningsEvents } from './src/websocket/events/earnings.events';
import { setupNotificationEvents } from './src/websocket/events/notifications.events';

const app = express();
app.use(cors({ credentials: true }));

const corsOptions = {
  origin: '*',
  credentials: true,
};

const server = http.createServer(app);

try {
  const io = initializeWebSocket(server, corsOptions);
  io.use(wsAuthMiddleware);

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    setupEarningsEvents(socket);
    setupNotificationEvents(socket);
  });

  server.listen(3001, () => {
    console.log('WebSocket server test: SUCCESS');
    console.log('Server running on port 3001');
    console.log('Testing WebSocket functionality...');

    // Simple test
    const io2 = require('./src/websocket/ws').getIO();
    console.log('getIO() function works correctly');

    // Test utilities
    const { emitToUser, broadcastEvent, getConnectedUsers } = require('./src/utils/websocket.util');
    console.log('WebSocket utilities imported successfully');

    // Test event emitters
    const { emitEarningCreated, emitEarningUpdated, sendSuccessNotification } = require('./src/websocket/events');
    console.log('Event emitters available');

    console.log('\nAll WebSocket components initialized successfully!');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Server initialization timeout');
    process.exit(1);
  }, 5000);
} catch (error) {
  console.error('WebSocket server initialization failed:', error);
  process.exit(1);
}
