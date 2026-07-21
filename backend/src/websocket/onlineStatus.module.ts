import { Module } from '@nestjs/common';
import { OnlineStatusService } from './onlineStatus.service';
import { WebsocketGateway } from './websocket.gateway';

@Module({
	imports: [],
	providers: [OnlineStatusService],
	exports: [OnlineStatusService],
})
export class OnlineStatusModule {}
