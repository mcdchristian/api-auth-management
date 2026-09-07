# Future Features & Improvements Roadmap

## 🔐 Security Features

### Two-Factor Authentication (2FA)
- [ ] Add TOTP (Time-based One-Time Password) support using `speakeasy` library
- [ ] QR code generation for authenticator apps
- [ ] Recovery codes for account recovery
- [ ] Endpoint: `POST /auth/2fa/setup` - Generate 2FA secret
- [ ] Endpoint: `POST /auth/2fa/verify` - Verify OTP
- [ ] Endpoint: `POST /auth/2fa/disable` - Disable 2FA
- [ ] Enforce 2FA for admin users
- [ ] Model: Add `totpSecret`, `twoFactorEnabled`, `backupCodes` to User entity

### Email Verification
- [ ] Send verification email on registration
- [ ] Endpoint: `POST /auth/email/send-verification` - Resend verification email
- [ ] Endpoint: `POST /auth/email/verify` - Verify email token
- [ ] Prevent login until email is verified (configurable)
- [ ] Model: Add `emailVerified`, `emailVerificationToken`, `emailVerificationExpires` to User entity
- [ ] Email service integration (SendGrid, AWS SES, SMTP)
- [ ] Email templates for verification, password reset, etc.

### Password Recovery / Forgot Password
- [ ] Endpoint: `POST /auth/forgot-password` - Request password reset
- [ ] Endpoint: `POST /auth/reset-password` - Reset password with token
- [ ] Send password reset link via email
- [ ] Token expiration (e.g., 1 hour)
- [ ] Model: Add `passwordResetToken`, `passwordResetExpires` to User entity
- [ ] One-time use tokens (invalidate after use)
- [ ] Rate limiting on password reset requests

## 📊 Data & Analytics

### Audit Logging
- [ ] Migrate audit logs from memory to database
- [ ] Create AuditLog entity/table
- [ ] Implement audit log retention policy
- [ ] Endpoint: `GET /audit/logs` (admin only) - Retrieve audit logs
- [ ] Endpoint: `GET /audit/failed-logins` (admin only) - Security monitoring
- [ ] Export audit logs to file (CSV/JSON)
- [ ] Archive old audit logs

### User Session Management
- [ ] Track active sessions per user
- [ ] Endpoint: `GET /auth/sessions` - List active sessions
- [ ] Endpoint: `POST /auth/sessions/:id/revoke` - Revoke specific session
- [ ] Endpoint: `POST /auth/sessions/revoke-all` - Revoke all sessions
- [ ] Session timeout configuration
- [ ] Concurrent session limit

## 👥 User Management Enhancements

### Soft Delete
- [x] Add `deletedAt` field to User entity
- [x] Implement soft delete on user deletion
- [x] Endpoint: `DELETE /users/:id` - Soft delete user
- [x] Filter out deleted users from queries by default
- [ ] Endpoint: `POST /users/:id/restore` (admin only) - Restore deleted user
- [ ] Restore functionality for admins

### Profile Management
- [ ] Endpoint: `POST /users/profile/avatar` - Upload avatar
- [ ] Endpoint: `GET /users/:id/avatar` - Download avatar
- [ ] Store avatar in object storage (S3, Azure Blob)
- [ ] User preferences (theme, language, notifications)
- [ ] Endpoint: `PATCH /users/preferences` - Update preferences

## 🔔 Notifications

### Email Notifications
- [ ] Welcome email on registration
- [ ] Suspicious login detection (new device, IP)
- [ ] Password change confirmation
- [ ] Account locked notification (after failed attempts)
- [ ] Monthly activity summary

### Webhook Events
- [ ] Emit events for auth actions (user.created, user.login, etc.)
- [ ] Webhook subscriptions management
- [ ] Retry mechanism for failed webhooks
- [ ] Webhook history and logs

## 🛡️ Advanced Security

### Account Lockout
- [x] Lock account after N failed login attempts
- [x] Automatic unlock after timeout
- [x] Configuration: lockout duration, attempt threshold
- [ ] Endpoint: `POST /auth/unlock-account` - Admin unlock
- [ ] Notify the account owner when a lockout is triggered

### IP Whitelisting / Blacklisting
- [ ] Admin endpoint to manage IP whitelist
- [ ] Automatic IP blacklist on suspicious activity
- [ ] Country-based access control (optional)
- [ ] VPN/Proxy detection

### OAuth 2.0 / Social Login
- [ ] Google OAuth integration
- [ ] GitHub OAuth integration
- [ ] Microsoft OAuth integration
- [ ] Link social accounts to existing user
- [ ] Endpoint: `POST /auth/oauth/google` - Google login/signup
- [ ] Endpoint: `POST /auth/oauth/github` - GitHub login/signup

## 📱 Mobile & Third-party

### API Key Management
- [ ] User API keys for programmatic access
- [ ] Endpoint: `POST /users/api-keys` - Create API key
- [ ] Endpoint: `GET /users/api-keys` - List API keys
- [ ] Endpoint: `DELETE /users/api-keys/:id` - Delete API key
- [ ] Rate limiting per API key
- [ ] Key rotation mechanism

### Device Management
- [ ] Track user devices
- [ ] Endpoint: `GET /auth/devices` - List trusted devices
- [ ] Endpoint: `POST /auth/devices/:id/revoke` - Revoke device
- [ ] Show device info (OS, browser, location, last activity)

## 🧪 Testing & Quality

### Test Coverage
- [x] Coverage thresholds enforced on the security-critical services
- [x] E2E coverage of the account lockout flow
- [ ] E2E tests for the remaining auth flows (email, password reset, 2FA)
- [ ] Load testing for rate limiting
- [ ] Security testing (OWASP Top 10)
- [ ] Penetration testing

### Performance
- [ ] Database query optimization (indexes, N+1 prevention)
- [ ] Move the audit trail out of the capped in-memory buffer
- [ ] Caching strategy (Redis) for user profiles
- [ ] Pagination optimization
- [ ] Database connection pooling

## 📚 Documentation

- [ ] API documentation improvements
- [ ] Setup guide for local development
- [ ] Deployment guide (Docker, K8s, Cloud)
- [ ] Security best practices guide
- [ ] OAuth/Social login setup guide
- [ ] Email configuration guide

## 🚀 Infrastructure & DevOps

### CI/CD
- [x] GitHub Actions workflow
- [x] Automated testing on PR (lint, build, unit matrix, e2e on Postgres)
- [ ] SonarQube code quality analysis
- [ ] Automated deployment to staging/production

### Monitoring & Alerting
- [ ] Application performance monitoring (APM)
- [ ] Error tracking (Sentry)
- [ ] Security alerts (suspicious login, rate limit exceeded)
- [ ] Database monitoring
- [ ] Uptime monitoring

### Database Migrations
- [x] TypeORM migrations for schema changes
- [x] Migration rollback capability (`npm run migration:revert`)
- [x] Opt-in migration on startup (`DB_RUN_MIGRATIONS`)
- [ ] Automated migration as a deployment step in CD

---

## Priority Order
1. Email Verification
2. Password Recovery / Forgot Password  
3. Audit Logging (Database)
4. Two-Factor Authentication
5. Account Lockout & IP Blacklisting
6. Session Management
7. API Key Management
8. OAuth 2.0 / Social Login
9. Performance & Caching
10. Comprehensive Testing

---

## Implementation Notes
- Use TypeORM migrations for schema changes
- Add comprehensive error handling and validation
- Keep audit logs for compliance (GDPR, SOC 2)
- Use environment variables for feature flags
- Document new endpoints in Swagger
- Add unit and integration tests for new features
- Update .env.example for new configurations
