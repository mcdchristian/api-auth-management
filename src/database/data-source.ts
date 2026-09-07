import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

/**
 * Standalone DataSource for the TypeORM CLI.
 *
 * The application builds its connection through DatabaseModule; the CLI runs
 * outside the Nest container, so migration commands need this separate entry
 * point. Both read the same environment variables.
 *
 * `synchronize` is deliberately absent: schema changes reach a deployed
 * database through migrations only.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'auth_db',
  entities: [User],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});
