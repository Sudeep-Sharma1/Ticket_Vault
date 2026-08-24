import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinEventRoom: (eventId: string) => void;
  leaveEventRoom: (eventId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket server
    const s = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to real-time sync server ID:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from sync server');
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const joinEventRoom = (eventId: string) => {
    if (socket && eventId) {
      socket.emit('join_event', eventId);
    }
  };

  const leaveEventRoom = (eventId: string) => {
    if (socket && eventId) {
      socket.emit('leave_event', eventId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinEventRoom,
        leaveEventRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
