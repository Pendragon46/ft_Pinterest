import { Module } from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { ArtworkController } from './artwork.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { FriendsModule } from 'src/friends/friends.module';
import { FriendsService } from 'src/friends/friends.service';
import { OnlineStatusModule } from 'src/websocket/onlineStatus.module';

@Module({
  imports: [CloudinaryModule, FriendsModule, OnlineStatusModule],
  controllers: [ArtworkController],
  providers: [ArtworkService, FriendsService],
})
export class ArtworkModule {}
