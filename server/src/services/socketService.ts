import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ENV } from '../config/env';

let io: SocketIOServer | null = null;

export const initSocketService = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins for dev/prod flexibility
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join show/event room for targeted seat updates
    socket.on('join_event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      console.log(`[WebSocket] Client ${socket.id} joined event room: event:${eventId}`);
    });

    socket.on('leave_event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
      console.log(`[WebSocket] Client ${socket.id} left event room: event:${eventId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const socketEmitter = {
  emitSeatStatusChange: (
    eventId: string,
    data: {
      seatIds: string[];
      status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'WAITLIST_RESERVED';
      heldByUserId?: string;
      expiresAt?: Date | string;
    }
  ) => {
    if (io) {
      io.to(`event:${eventId}`).emit('seat_status_changed', {
        eventId,
        ...data,
      });
    }
  },

  emitWaitlistUpdate: (
    eventId: string,
    data: {
      category: string;
      action: 'NEW_ENTRY' | 'OFFER_MADE' | 'OFFER_EXPIRED';
      totalWaiting?: number;
    }
  ) => {
    if (io) {
      io.to(`event:${eventId}`).emit('waitlist_updated', {
        eventId,
        ...data,
      });
    }
  },

  emitEventStatusChange: (eventId: string, status: string) => {
    if (io) {
      io.to(`event:${eventId}`).emit('event_status_changed', { eventId, status });
      io.emit('global_event_updated', { eventId, status });
    }
  },
};
