import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { FriendsModule } from '../friends/friends.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule, FriendsModule, WebsocketModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
