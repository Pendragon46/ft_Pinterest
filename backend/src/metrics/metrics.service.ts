import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
    private readonly register = new client.Registry();

    constructor() {
        client.collectDefaultMetrics({ register: this.register });
    }

    getMetrics() {
        return this.register.metrics();
    }

    getContentType() {
        return this.register.contentType;
    }
}
