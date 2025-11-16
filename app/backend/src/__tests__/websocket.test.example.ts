/**
 * WebSocket Testing Examples
 *
 * These are example tests showing how to test WebSocket functionality.
 * To run these tests, you need to set up a test environment with socket.io-client
 * and implement proper test setup/teardown.
 *
 * This is a reference implementation - adapt to your testing framework.
 */

// import { Server, Socket } from 'socket.io';
// import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
// import http from 'http';
// import express from 'express';
// import { initializeWebSocket } from '../websocket/ws';
// import { wsAuthMiddleware } from '../middleware/ws-auth.middleware';

// describe('WebSocket Tests', () => {
//   let server: http.Server;
//   let io: Server;
//   let clientSocket: ClientSocket;
//   const testToken = 'your-jwt-token-here';
//   const testUserId = 'test-user-123';

//   beforeAll((done) => {
//     // Setup test server
//     const app = express();
//     server = http.createServer(app);

//     io = initializeWebSocket(server, {
//       cors: { origin: '*' },
//     });

//     io.use(wsAuthMiddleware);

//     server.listen(3002, () => {
//       done();
//     });
//   });

//   afterAll(() => {
//     io.close();
//     server.close();
//   });

//   afterEach(() => {
//     if (clientSocket?.connected) {
//       clientSocket.disconnect();
//     }
//   });

//   describe('Connection', () => {
//     it('should connect with valid token', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         expect(clientSocket.connected).toBe(true);
//         done();
//       });

//       clientSocket.on('connect_error', (error) => {
//         done(error);
//       });
//     });

//     it('should reject connection without token', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: {},
//       });

//       clientSocket.on('connect_error', (error) => {
//         expect(error.message).toContain('Authentication token required');
//         done();
//       });
//     });
//   });

//   describe('Earnings Events', () => {
//     it('should receive earnings:new event', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         // Simulate server emitting earnings:new
//         io.to(`earnings:${testUserId}`).emit('earnings:new', {
//           event: 'earnings:new',
//           timestamp: new Date().toISOString(),
//           data: {
//             id: 'earning-123',
//             userId: testUserId,
//             platformId: 'platform-123',
//             platform: { id: 'platform-123', name: 'Upwork', color: '#fff' },
//             date: '2024-01-15',
//             hours: 8,
//             amount: 100,
//             hourly_rate: 12.5,
//           },
//         });
//       });

//       clientSocket.on('earnings:new', (response) => {
//         expect(response.data.id).toBe('earning-123');
//         expect(response.data.amount).toBe(100);
//         done();
//       });

//       setTimeout(() => done(new Error('Event not received')), 5000);
//     });

//     it('should receive earnings:updated event', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         io.to(`earnings:${testUserId}`).emit('earnings:updated', {
//           event: 'earnings:updated',
//           timestamp: new Date().toISOString(),
//           data: {
//             id: 'earning-123',
//             userId: testUserId,
//             changes: { amount: 150 },
//             updatedAt: new Date().toISOString(),
//           },
//         });
//       });

//       clientSocket.on('earnings:updated', (response) => {
//         expect(response.data.changes.amount).toBe(150);
//         done();
//       });

//       setTimeout(() => done(new Error('Event not received')), 5000);
//     });

//     it('should receive earnings:deleted event', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         io.to(`earnings:${testUserId}`).emit('earnings:deleted', {
//           event: 'earnings:deleted',
//           timestamp: new Date().toISOString(),
//           data: { id: 'earning-123' },
//         });
//       });

//       clientSocket.on('earnings:deleted', (response) => {
//         expect(response.data.id).toBe('earning-123');
//         done();
//       });

//       setTimeout(() => done(new Error('Event not received')), 5000);
//     });
//   });

//   describe('Notification Events', () => {
//     it('should receive notification event', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         io.to(`notifications:${testUserId}`).emit('notification', {
//           event: 'notification',
//           timestamp: new Date().toISOString(),
//           data: {
//             id: 'notif-123',
//             title: 'Test Notification',
//             message: 'This is a test',
//             type: 'success',
//             timestamp: new Date().toISOString(),
//             dismissible: true,
//             duration: 5000,
//           },
//         });
//       });

//       clientSocket.on('notification', (response) => {
//         expect(response.data.title).toBe('Test Notification');
//         expect(response.data.type).toBe('success');
//         done();
//       });

//       setTimeout(() => done(new Error('Event not received')), 5000);
//     });
//   });

//   describe('Room Management', () => {
//     it('should join earnings room on subscribe', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         clientSocket.emit('earnings:subscribe');
//         // Verify subscription by emitting to room
//         setTimeout(() => {
//           io.to(`earnings:${testUserId}`).emit('earnings:new', {
//             event: 'earnings:new',
//             timestamp: new Date().toISOString(),
//             data: {
//               id: 'earning-test',
//               userId: testUserId,
//               amount: 100,
//             },
//           });
//         }, 100);
//       });

//       clientSocket.on('earnings:new', () => {
//         done();
//       });

//       setTimeout(() => done(new Error('Subscribe failed')), 5000);
//     });

//     it('should leave earnings room on unsubscribe', (done) => {
//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         clientSocket.emit('earnings:subscribe');
//         setTimeout(() => {
//           clientSocket.emit('earnings:unsubscribe');
//           setTimeout(() => {
//             io.to(`earnings:${testUserId}`).emit('earnings:new', {
//               event: 'earnings:new',
//               data: { id: 'earning-test' },
//             });
//             // Should not receive event
//             setTimeout(() => {
//               done();
//             }, 1000);
//           }, 100);
//         }, 100);
//       });

//       let receivedEvent = false;
//       clientSocket.on('earnings:new', () => {
//         receivedEvent = true;
//       });

//       setTimeout(() => {
//         if (!receivedEvent) {
//           done();
//         } else {
//           done(new Error('Should not receive event after unsubscribe'));
//         }
//       }, 5000);
//     });
//   });

//   describe('Utility Functions', () => {
//     it('should emit to specific user', (done) => {
//       const { emitToUser } = require('../utils/websocket.util');

//       clientSocket = ioClient('http://localhost:3002', {
//         auth: { token: testToken },
//       });

//       clientSocket.on('connect', () => {
//         emitToUser(testUserId, 'test:event', { message: 'Hello' });
//       });

//       clientSocket.on('test:event', (response) => {
//         expect(response.data.message).toBe('Hello');
//         done();
//       });

//       setTimeout(() => done(new Error('Event not received')), 5000);
//     });

//     it('should get connected users', () => {
//       const { getConnectedUsers } = require('../utils/websocket.util');

//       // This would require properly authenticated connections
//       const users = getConnectedUsers();
//       expect(Array.isArray(users)).toBe(true);
//     });

//     it('should get user socket count', () => {
//       const { getUserSocketCount } = require('../utils/websocket.util');

//       const count = getUserSocketCount(testUserId);
//       expect(typeof count).toBe('number');
//       expect(count).toBeGreaterThanOrEqual(0);
//     });
//   });
// });

/**
 * Integration Test Example
 *
 * This shows how to test the full flow from controller to WebSocket emission
 */
// describe('Earning Controller WebSocket Integration', () => {
//   let mockReq: any;
//   let mockRes: any;
//   let io: Server;

//   beforeEach(() => {
//     mockReq = {
//       user: { id: 'user-123', email: 'test@example.com' },
//       body: {},
//     };

//     mockRes = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn().mockReturnThis(),
//     };

//     // Mock Socket.io
//     io = {
//       to: jest.fn().mockReturnThis(),
//       emit: jest.fn(),
//     } as any;
//   });

//   it('should emit earnings:new event on earning creation', async () => {
//     // Setup test data
//     mockReq.body = {
//       platformId: 'platform-123',
//       date: '2024-01-15',
//       amount: 100,
//       hours: 8,
//     };

//     // Mock Prisma
//     jest.mock('../lib/prisma', () => ({
//       earning: {
//         create: jest.fn().mockResolvedValue({
//           id: 'earning-123',
//           platformId: 'platform-123',
//           amount: 100,
//           hours: 8,
//           date: new Date('2024-01-15'),
//           platform: { id: 'platform-123', name: 'Upwork', color: '#fff' },
//         }),
//       },
//     }));

//     // Run controller
//     // await createEarning(mockReq, mockRes);

//     // Verify WebSocket event was emitted
//     // expect(io.to).toHaveBeenCalledWith('earnings:user-123');
//     // expect(io.emit).toHaveBeenCalledWith('earnings:new', expect.objectContaining({
//     //   event: 'earnings:new',
//     //   data: expect.objectContaining({
//     //     id: 'earning-123',
//     //     amount: 100,
//     //   }),
//     // }));
//   });
// });

export {};
