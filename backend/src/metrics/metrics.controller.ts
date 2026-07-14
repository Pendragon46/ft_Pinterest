import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @Header('Content-type', 'text/plain')
    async getMetrics() {
        return this.metricsService.getMetrics();
    }
}
