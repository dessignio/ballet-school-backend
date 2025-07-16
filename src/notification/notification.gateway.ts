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
  // Map<socketId, { userId: string, studioId: string }>
  private clients: Map<string, { userId: string; studioId: string }> =
    new Map();

  afterInit(server: Server) {
    this.logger.log('NotificationGateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove the client from the map on disconnect
    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(socketId);
        this.logger.log(
          `User ${clientInfo.userId} (studio ${clientInfo.studioId}) unregistered`,
        );
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    client: Socket,
    payload: { userId: string; studioId: string },
  ): void {
    if (!payload || !payload.userId || !payload.studioId) {
      this.logger.warn(
        `Client ${client.id} tried to register with invalid payload.`,
      );
      return;
    }
    this.logger.log(
      `Client registered: ${client.id} for user ${payload.userId} in studio ${payload.studioId}`,
    );
    this.clients.set(client.id, payload);
  }

  sendNotificationToUser(userId: string, payload: ServerNotificationPayload) {
    // Find the socket ID for the given userId (this assumes a user only has one active socket)
    let socketId: string | undefined;
    for (const [sId, clientInfo] of this.clients.entries()) {
      if (clientInfo.userId === userId) {
        socketId = sId;
        break;
      }
    }

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

  sendNotificationToStudio(
    studioId: string,
    payload: ServerNotificationPayload,
  ) {
    let sentCount = 0;
    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (clientInfo.studioId === studioId) {
        this.server.to(socketId).emit('notification', payload);
        sentCount++;
      }
    }
    this.logger.log(
      `Broadcasted notification to ${sentCount} clients in studio ${studioId}.`,
    );
  }

  broadcastDataUpdate(entity: string, payload: any, studioId: string) {
    let sentCount = 0;
    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (clientInfo.studioId === studioId) {
        this.server.to(socketId).emit('data:update', { entity, payload });
        sentCount++;
      }
    }
    this.logger.log(
      `Broadcasting data update for entity: ${entity} with payload ${JSON.stringify(payload)} to ${sentCount} clients in studio ${studioId}.`,
    );
  }

  // Remove the global sendNotificationToAll as it's no longer multi-tenant
  // sendNotificationToAll(payload: ServerNotificationPayload) {
  //   this.server.emit('notification', payload);
  //   this.logger.log(`Broadcasted notification to all clients.`);
  // }
}
