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
import { MetricsService } from './metrics/metrics.service';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [PrismaModule, UsersModule, ArtworkModule,
	CloudinaryModule,
	ConfigModule.forRoot({ isGlobal: true }),
	MulterModule.register({	storage: memoryStorage()}),
	CloudinaryModule,
	FollowModule,
	LikesModule,
  	HealthModule,
	MetricsModule],
  controllers: [AppController],
  providers: [AppService, CloudinaryService, HealthService, MetricsService],
})
export class AppModule {}
