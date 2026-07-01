import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HealthService } from './health/health.service';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, UsersModule, HealthModule],
  controllers: [AppController],
  providers: [AppService, HealthService],
})
export class AppModule {}
