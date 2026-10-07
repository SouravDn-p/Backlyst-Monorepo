import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startedAt = new Date();

  getHello() {
    return {
      message: 'Backlink Management Server Running.',
      documentation: `http://localhost:${process.env.PORT}/api/docs`,
    };
  }

  getHealth() {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startedAt.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      status: 'ok',
      timestamp: now.toISOString(),
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
