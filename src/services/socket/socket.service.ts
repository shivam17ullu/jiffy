import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

let io: SocketIOServer | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Adjust origins as needed in production
      methods: ["GET", "POST"],
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const payload = jwt.verify(token, process.env.TOKEN as string) as {
        userId: number;
      };
      socket.userId = payload.userId;
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    if (userId) {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`[Socket] User ${userId} connected and joined room ${roomName}`);
    }

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io is not initialized yet!");
  }
  return io;
};

/**
 * Emit an event to a specific user
 * @param userId - Target user ID
 * @param event - Event name
 * @param data - Payload data
 */
export const emitToUser = (userId: number, event: string, data: any) => {
  if (io) {
    const roomName = `user_${userId}`;
    io.to(roomName).emit(event, data);
    console.log(`[Socket] Emitted event '${event}' to room ${roomName}`);
  } else {
    console.warn(`[Socket] Cannot emit event '${event}' - Socket.io not initialized`);
  }
};
