/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// Define a richer notification type for the server payload
interface ServerNotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your frontend URL
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');
  // Map<userId, socketId>
  private clients: Map<string, string> = new Map();

  afterInit(server: Server) {
    this.logger.log('NotificationGateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Find and remove the user from the map on disconnect
    for (const [userId, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(userId);
        this.logger.log(`User ${userId} unregistered`);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: string): void {
    if (!userId) {
      this.logger.warn(`Client ${client.id} tried to register with no userId.`);
      return;
    }
    this.logger.log(`Client registered: ${client.id} for user ${userId}`);
    this.clients.set(userId, client.id);
  }

  sendNotificationToUser(userId: string, payload: ServerNotificationPayload) {
    const socketId = this.clients.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', payload);
      this.logger.log(
        `Sent notification to user ${userId} (socket ${socketId})`,
      );
    } else {
      this.logger.warn(
        `Could not find socket for user ${userId}. Notification not sent.`,
      );
    }
  }

  sendNotificationToAll(payload: ServerNotificationPayload) {
    this.server.emit('notification', payload);
    this.logger.log(`Broadcasted notification to all clients.`);
  }

  broadcastDataUpdate(entity: string, payload: any) {
    this.logger.log(
      `Broadcasting data update for entity: ${entity} with payload ${JSON.stringify(payload)}`,
    );
    this.server.emit('data:update', { entity, payload });
  }
}
