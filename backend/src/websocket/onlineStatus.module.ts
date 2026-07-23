import { Module } from '@nestjs/common';
import { OnlineStatusService } from './onlineStatus.service';

@Module({
  imports: [],
  providers: [OnlineStatusService],
  exports: [OnlineStatusService],
})
export class OnlineStatusModule {}
