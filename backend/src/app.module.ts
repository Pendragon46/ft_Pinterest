import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ArtworkModule } from './artwork/artwork.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { FollowModule } from './follow/follow.module';
import { LikesModule } from './likes/likes.module';
import { HealthService } from './health/health.service';
import { HealthModule } from './health/health.module';
import { CommentModule } from './comment/comment.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles/roles.guard';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { FriendsModule } from './friends/friends.module';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { OnlineStatusModule } from './websocket/onlineStatus.module';

@Module({
  imports: [PrismaModule, UsersModule, ArtworkModule,
	CloudinaryModule,
	ConfigModule.forRoot({ isGlobal: true }),
	MulterModule.register({	storage: memoryStorage()}),
	CloudinaryModule,
	FollowModule,
	LikesModule,
    HealthModule,
	CommentModule,
	AuthModule,
	SearchModule,
	FriendsModule,
	OnlineStatusModule,
  ],
  controllers: [AppController],
  providers: [AppService, CloudinaryService, HealthService, WebsocketGateway,{
    provide: APP_GUARD,
    useClass: RolesGuard,
  }, {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
}],
  
})
export class AppModule {}
