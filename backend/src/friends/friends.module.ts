import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { OnlineStatusModule } from 'src/websocket/onlineStatus.module';

@Module({
  imports: [OnlineStatusModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
