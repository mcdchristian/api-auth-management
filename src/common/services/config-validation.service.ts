import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service to validate critical environment variables at startup
 * Ensures that required secrets and configuration are properly set
 */
@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';
    const isProduction = nodeEnv === 'production';

    this.logger.log(`Environment: ${nodeEnv}`);

    // Validate critical secrets
    const requiredSecrets = [
      'jwt.secret',
      'jwt.refreshSecret',
      'database.password',
    ];

    const missingSecrets: string[] = [];

    for (const secret of requiredSecrets) {
      const value = this.configService.get<string>(secret);
      if (!value) {
        missingSecrets.push(secret);
      }

      // In production, check if using default secrets
      if (isProduction && value?.includes('change-in-production')) {
        throw new BadRequestException(
          `SECURITY ERROR: Using default secret "${secret}" in production!`,
        );
      }

      // Warn if secret is too weak (less than 32 characters)
      if (
        value &&
        value.length < 32 &&
        !value.includes('change-in-production')
      ) {
        this.logger.warn(
          `WARNING: Secret "${secret}" is less than 32 characters. Consider using a stronger secret.`,
        );
      }
    }

    if (missingSecrets.length > 0 && isProduction) {
      throw new Error(
        `Missing required environment variables: ${missingSecrets.join(', ')}`,
      );
    }

    // Validate database configuration
    const dbHost = this.configService.get<string>('database.host');
    const dbPort = this.configService.get<number>('database.port');

    if (!dbHost || !dbPort) {
      throw new Error('Database configuration is incomplete');
    }

    // Validate JWT configuration
    const jwtExpiration = this.configService.get<string>('jwt.expiration');
    const refreshExpiration = this.configService.get<string>(
      'jwt.refreshExpiration',
    );

    if (!jwtExpiration || !refreshExpiration) {
      throw new Error('JWT expiration times not configured');
    }

    // Validate CORS origins
    const allowedOrigins = this.configService.get<string[]>(
      'cors.allowedOrigins',
    );
    if (!allowedOrigins || allowedOrigins.length === 0) {
      this.logger.warn(
        'WARNING: CORS allowedOrigins is empty or not configured',
      );
    }

    // Validate port number
    const port = this.configService.get<number>('port');
    if (!port || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}`);
    }

    this.logger.log('✅ Configuration validation passed');
    this.logConfigurationSummary(isProduction);
  }

  private logConfigurationSummary(isProduction: boolean): void {
    this.logger.log('📋 Configuration Summary:');
    this.logger.log(
      `  - Database: ${this.configService.get<string>('database.host')}:${this.configService.get<number>('database.port')}`,
    );
    this.logger.log(
      `  - JWT Expiration: ${this.configService.get<string>('jwt.expiration')}`,
    );
    this.logger.log(
      `  - Refresh Token Expiration: ${this.configService.get<string>('jwt.refreshExpiration')}`,
    );
    this.logger.log(
      `  - Rate Limiting: ${this.configService.get<number>('throttle.limit')} requests per ${this.configService.get<number>('throttle.ttl')}ms`,
    );
    this.logger.log(
      `  - CORS Origins: ${(this.configService.get<string[]>('cors.allowedOrigins') || []).join(', ')}`,
    );

    if (isProduction) {
      this.logger.warn(
        '⚠️  PRODUCTION MODE - Ensure all security measures are in place:',
      );
      this.logger.warn('  ✓ All environment variables set securely');
      this.logger.warn('  ✓ Database uses strong password and SSL/TLS');
      this.logger.warn('  ✓ JWT secrets are long random strings');
      this.logger.warn('  ✓ CORS origins are restricted to trusted domains');
      this.logger.warn('  ✓ Rate limiting is strict for auth endpoints');
      this.logger.warn('  ✓ HTTPS/TLS is enabled');
      this.logger.warn('  ✓ Audit logging is enabled');
    }
  }
}
