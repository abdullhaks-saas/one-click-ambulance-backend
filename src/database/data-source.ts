import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dbType = process.env.DATABASE_TYPE || 'mysql';
const isMySQL = dbType === 'mysql';

const databaseUrl = process.env.DATABASE_URL;

const dataSource = databaseUrl
  ? new DataSource({
      type: 'mysql',
      url: databaseUrl,
      entities: ['src/**/*.entity{.ts,.js}'],
      migrations: ['src/database/migrations/*{.ts,.js}'],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new DataSource({
      type: isMySQL ? 'mysql' : 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(
        process.env.DATABASE_PORT || (isMySQL ? '3306' : '5432'),
        10,
      ),
      username: process.env.DATABASE_USER || (isMySQL ? 'root' : 'postgres'),
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'ambulance_db',
      entities: ['src/**/*.entity{.ts,.js}'],
      migrations: ['src/database/migrations/*{.ts,.js}'],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      ssl:
        process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
    });

export default dataSource;
