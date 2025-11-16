/**
 * React Hook for WebSocket connection
 *
 * This is a reference implementation for the frontend
 * Place this file in the frontend/src/hooks directory
 */

// import { useEffect, useRef, useCallback } from 'react';
// import { io, Socket } from 'socket.io-client';
// import { useAuth } from './useAuth'; // or your auth hook

// interface UseWebSocketOptions {
//   autoConnect?: boolean;
//   reconnectionDelay?: number;
// }

// export const useWebSocket = (options: UseWebSocketOptions = {}) => {
//   const { autoConnect = true, reconnectionDelay = 1000 } = options;
//   const { token } = useAuth(); // Get JWT token from auth context
//   const socketRef = useRef<Socket | null>(null);

//   // Initialize WebSocket connection
//   const connect = useCallback(() => {
//     if (socketRef.current?.connected) {
//       return;
//     }

//     const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
//       auth: {
//         token: token, // Pass JWT token for authentication
//       },
//       reconnection: true,
//       reconnectionDelay: reconnectionDelay,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: 5,
//     });

//     // Connection events
//     socket.on('connect', () => {
//       console.log('WebSocket connected:', socket.id);

//       // Subscribe to earnings updates
//       socket.emit('earnings:subscribe');

//       // Subscribe to notifications
//       socket.emit('notifications:subscribe');
//     });

//     socket.on('disconnect', (reason) => {
//       console.log('WebSocket disconnected:', reason);
//     });

//     socket.on('error', (error) => {
//       console.error('WebSocket error:', error);
//     });

//     socketRef.current = socket;
//   }, [token, reconnectionDelay]);

//   // Disconnect WebSocket
//   const disconnect = useCallback(() => {
//     if (socketRef.current) {
//       socketRef.current.disconnect();
//       socketRef.current = null;
//     }
//   }, []);

//   // Listen to earnings updates
//   const onEarningNew = useCallback((callback: (data: any) => void) => {
//     if (socketRef.current) {
//       socketRef.current.on('earnings:new', callback);
//     }
//   }, []);

//   const onEarningUpdated = useCallback((callback: (data: any) => void) => {
//     if (socketRef.current) {
//       socketRef.current.on('earnings:updated', callback);
//     }
//   }, []);

//   const onEarningDeleted = useCallback((callback: (data: any) => void) => {
//     if (socketRef.current) {
//       socketRef.current.on('earnings:deleted', callback);
//     }
//   }, []);

//   // Listen to notifications
//   const onNotification = useCallback((callback: (data: any) => void) => {
//     if (socketRef.current) {
//       socketRef.current.on('notification', callback);
//     }
//   }, []);

//   // Cleanup on unmount
//   useEffect(() => {
//     if (autoConnect && token) {
//       connect();
//     }

//     return () => {
//       disconnect();
//     };
//   }, [autoConnect, token, connect, disconnect]);

//   return {
//     socket: socketRef.current,
//     connected: socketRef.current?.connected ?? false,
//     connect,
//     disconnect,
//     onEarningNew,
//     onEarningUpdated,
//     onEarningDeleted,
//     onNotification,
//   };
// };

// EXAMPLE USAGE:
//
// function EarningsPage() {
//   const { onEarningNew, onEarningUpdated, onNotification } = useWebSocket();
//
//   useEffect(() => {
//     // Listen to new earnings
//     onEarningNew((data) => {
//       console.log('New earning:', data);
//       // Update UI with new earning
//     });
//
//     // Listen to earnings updates
//     onEarningUpdated((data) => {
//       console.log('Earning updated:', data);
//       // Update UI with updated earning
//     });
//
//     // Listen to notifications
//     onNotification((data) => {
//       console.log('Notification:', data);
//       // Show notification to user
//     });
//   }, [onEarningNew, onEarningUpdated, onNotification]);
//
//   return <div>Earnings Page</div>;
// }

export {};
