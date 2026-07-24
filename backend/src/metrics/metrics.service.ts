import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register = new client.Registry();

  readonly httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    registers: [this.register],
  });

  constructor() {
    client.collectDefaultMetrics({
      register: this.register,
    });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }

    incrementHttpRequests(): void {
    this.httpRequestsTotal.inc();
  }
}