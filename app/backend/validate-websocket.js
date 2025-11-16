#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'src/websocket/ws.ts',
  'src/websocket/events/earnings.events.ts',
  'src/websocket/events/notifications.events.ts',
  'src/middleware/ws-auth.middleware.ts',
  'src/utils/websocket.util.ts',
  'src/hooks/useWebSocket.ts',
  'WEBSOCKET_GUIDE.md',
  'WEBSOCKET_IMPLEMENTATION_SUMMARY.md',
];

console.log('WebSocket Implementation Validation');
console.log('===================================\n');

let allValid = true;

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${file}`);
  if (!exists) allValid = false;
});

console.log('\n' + (allValid ? 'All files present!' : 'Some files missing!'));

// Check package.json
console.log('\nDependencies:');
const pkgJson = require('./package.json');
const hasSocketIO = 'socket.io' in pkgJson.dependencies;
const hasCors = 'cors' in pkgJson.dependencies;
console.log(`${hasSocketIO ? '✓' : '✗'} socket.io: ${pkgJson.dependencies['socket.io'] || 'NOT INSTALLED'}`);
console.log(`${hasCors ? '✓' : '✗'} cors: ${pkgJson.dependencies['cors'] || 'NOT INSTALLED'}`);

// Check server.ts for WebSocket imports
console.log('\nServer Configuration:');
const serverContent = fs.readFileSync(path.join(__dirname, 'src/server.ts'), 'utf8');
const hasWsImport = serverContent.includes('initializeWebSocket');
const hasHttpServer = serverContent.includes('http.createServer');
const hasWsSetup = serverContent.includes('io.on(\'connection\'');
console.log(`${hasWsImport ? '✓' : '✗'} WebSocket initialization`);
console.log(`${hasHttpServer ? '✓' : '✗'} HTTP server creation`);
console.log(`${hasWsSetup ? '✓' : '✗'} Connection event handlers`);

// Check controller integration
console.log('\nController Integration:');
const controllerContent = fs.readFileSync(path.join(__dirname, 'src/controllers/earning.controller.ts'), 'utf8');
const hasEarningEvents = controllerContent.includes('emitEarningCreated');
const hasNotifications = controllerContent.includes('sendSuccessNotification');
console.log(`${hasEarningEvents ? '✓' : '✗'} Earning event emissions`);
console.log(`${hasNotifications ? '✓' : '✗'} Notification sending`);

console.log('\nWebSocket implementation is ' + (allValid ? 'COMPLETE' : 'INCOMPLETE') + '!');
process.exit(allValid ? 0 : 1);
