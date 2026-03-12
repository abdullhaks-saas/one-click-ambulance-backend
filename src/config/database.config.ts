import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbType = configService.get('DATABASE_TYPE') || 'mysql';
  const isMySQL = dbType === 'mysql';

  return {
    type: isMySQL ? 'mysql' : 'postgres',
    host: configService.get<string>('DATABASE_HOST'),
    port: configService.get<number>('DATABASE_PORT') ?? (isMySQL ? 3306 : 5432),
    username: configService.get<string>('DATABASE_USER'),
    password: configService.get<string>('DATABASE_PASSWORD'),
    database: configService.get<string>('DATABASE_NAME'),
    autoLoadEntities: true,
    synchronize: configService.get('DATABASE_SYNC') === 'true',
    ssl:
      configService.get('DATABASE_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : false,
    logging: configService.get('NODE_ENV') === 'development',
  };
};
