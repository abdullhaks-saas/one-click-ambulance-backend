import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT') ?? 6379,
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      tls: {},
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on('error', (err) => this.logger.error('Redis error:', err));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
