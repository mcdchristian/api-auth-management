export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'auth_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secretKey',
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
});
