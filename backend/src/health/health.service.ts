import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    let database = 'offline';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'online';
    } catch {
      database = 'offline';
    }

    return {
      status: database === 'online' ? 'ok' : 'error',
      backend: 'online',
      database,
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
