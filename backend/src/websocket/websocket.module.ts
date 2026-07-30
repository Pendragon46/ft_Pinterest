import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FriendsModule } from '../friends/friends.module';
import { OnlineStatusModule } from './onlineStatus.module';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [AuthModule, OnlineStatusModule, FriendsModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
