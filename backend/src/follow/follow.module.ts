import { Module } from '@nestjs/common';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { FriendsModule } from '../friends/friends.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [FriendsModule, WebsocketModule, ChatModule],
  controllers: [FollowController],
  providers: [FollowService],
})
export class FollowModule {}