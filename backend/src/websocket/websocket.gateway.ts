import {  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { OnlineStatusService } from './online-status.service';
import { JwtService } from '@nestjs/jwt';
import { FriendsService } from 'src/friends/friends.service';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {

	constructor(private readonly onlineStatusService,
				private readonly jwtService: JwtService,
				private readonly friendsService: FriendsService

	) {}

	@WebSocketServer()
	server!:Server;

	verifyToken(client: Socket) {
		let token = client.handshake.auth.token;
		if (!token) {
			return null;
		}
		token = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
		return token;
	}

	async NotifyFriendsAboutStatusChange(userId: string, status: 'online' | 'offline') {
		const friends = await this.friendsService.getFriends(userId)
		friends.forEach(friend => {
			if (this.onlineStatusService.isUserOnline(friend.id)) {
				const socketIds = this.onlineStatusService.getSocketIdsForUser(friend.id);
				if (socketIds) {
					socketIds.forEach(socketId => {
						this.server.to(socketId).emit('friendStatusChange', { userId, status });
					});
				}
			}
		});
	}


//in frontend, use this code to connect to the websocket server and send the jwt token in the auth header
// 	const socket = io("http://localhost:3000", {
//   auth: {
//     token: jwt
//   }
// after you use the GetonlineFriends endpoint to get the list of online friends, you can listen for the friendStatusChange event to update the friend status in the UI
/*
in frontend, use this code to listen for the friendStatusChange event and update the friend status in the UI
socket.on('friendStatusChange', (data) => {
  console.log(data);

  // exemple :
  // data.userId = "123"
  // data.status = "online"

  updateFriendStatus(data.userId, data.status);
});*/
	handleConnection(client: Socket) {
		let token: any;
		console.log(`Client connected: ${client.id}`);
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

	async handleDisconnect(client: any) {
		console.log(`Client disconnected: ${client.id}`);
		this.onlineStatusService.removeOnlineUser(client.data.userId, client.id);
		this.NotifyFriendsAboutStatusChange(client.data.userId, 'offline');
	}

}
