export default () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Validate required secrets in production
  if (nodeEnv === 'production') {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      name: process.env.DB_NAME || 'auth_db',
      ssl: process.env.DB_SSL === 'true',
      // Opt-in so a rolling deploy of several instances does not race on the
      // same migration; leave it off and run `npm run migration:run` as a
      // release step instead.
      runMigrations: process.env.DB_RUN_MIGRATIONS === 'true',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
      expiration: process.env.JWT_EXPIRATION || '15m',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET ||
        'dev-only-refresh-secret-change-in-production',
      refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    cors: {
      allowedOrigins: (
        process.env.ALLOWED_ORIGINS ||
        'http://localhost:3000,http://localhost:5173'
      ).split(','),
    },
    security: {
      // bcrypt work factor. Higher is stronger but slower; 12 is the current
      // OWASP baseline, 10 keeps test suites fast.
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      // Brute-force protection: lock an account after this many consecutive
      // failed logins, for this long.
      maxFailedLoginAttempts: parseInt(
        process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5',
        10,
      ),
      lockoutDurationMs: parseInt(
        process.env.LOCKOUT_DURATION_MS || '900000',
        10,
      ),
    },
    // Swagger publishes the full API surface, including every route an
    // attacker would otherwise have to guess. Off in production unless
    // explicitly re-enabled.
    swagger: {
      enabled: process.env.SWAGGER_ENABLED
        ? process.env.SWAGGER_ENABLED === 'true'
        : nodeEnv !== 'production',
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
    },
  };
};
