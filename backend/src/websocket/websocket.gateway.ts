import {WebSocketGateway,WebSocketServer,OnGatewayConnection,OnGatewayDisconnect,} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { OnlineStatusService } from './onlineStatus.service';
import { JwtService } from '@nestjs/jwt';
import { FriendsService } from 'src/friends/friends.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly onlineStatusService: OnlineStatusService,
    private readonly jwtService: JwtService,
    private readonly friendsService: FriendsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  verifyToken(client: Socket) {
    let token = client.handshake.auth.token;
    if (!token) {
      return null;
    }
    token = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
    return token;
  }

  async NotifyFriendsAboutStatusChange(
    userId: string,
    status: 'online' | 'offline',
  ) {
    const friends = await this.friendsService.getFriends(userId);
    friends.forEach((friend) => {
      if (this.onlineStatusService.isUserOnline(friend.id)) {
        const socketIds = this.onlineStatusService.getSocketIdsForUser(
          friend.id,
        );
        if (socketIds) {
          socketIds.forEach((socketId) => {
            this.server
              .to(socketId)
              .emit('friendStatusChange', { userId, status });
          });
        }
      }
    });
  }

  /** Emit an event to every open socket of a user (multi-tab). Reuses the
      presence registry — no Socket.IO rooms. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    const socketIds = this.onlineStatusService.getSocketIdsForUser(userId);
    socketIds?.forEach((socketId) =>
      this.server.to(socketId).emit(event, payload),
    );
  }

  handleConnection(client: Socket) {
    let token: any;
    try {
      token = this.verifyToken(client);
      if (!token) {
        console.error('No token provided');
        client.disconnect();
        return;
      }
      client.data.userId = token.sub;
    } catch (error) {
      console.error('Token verification failed:', error);
      client.disconnect();
      return;
    }
    this.onlineStatusService.addOnlineUser(client.id, token.sub);
    this.NotifyFriendsAboutStatusChange(token.sub, 'online');
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return; // unauthenticated socket: nothing was registered
    this.onlineStatusService.removeOnlineUser(userId, client.id);
    this.NotifyFriendsAboutStatusChange(userId, 'offline');
  }
}
