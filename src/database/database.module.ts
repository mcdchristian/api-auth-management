import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';
        // Schema is auto-created only on a developer machine. Anywhere the
        // data matters — staging included, not just production — it comes
        // from the migrations in src/database/migrations.
        const isDevelopment = nodeEnv === 'development';

        return {
          type: 'postgres' as const,
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.name'),
          ssl: configService.get<boolean>('database.ssl')
            ? { rejectUnauthorized: false }
            : false,
          autoLoadEntities: true,
          synchronize: isDevelopment,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsTableName: 'migrations',
          migrationsRun: configService.get<boolean>('database.runMigrations'),
          logging: isDevelopment
            ? (['error', 'warn'] as const)
            : (['error'] as const),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
