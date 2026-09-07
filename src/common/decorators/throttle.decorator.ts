import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Stricter rate limiting for sensitive auth endpoints
 * 5 requests per minute per IP
 */
export const AuthThrottle = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } });

/**
 * Moderate rate limiting for general API endpoints
 * 20 requests per minute per IP
 */
export const ApiThrottle = () =>
  Throttle({ default: { limit: 20, ttl: 60000 } });

/**
 * Exempt an endpoint from rate limiting (health checks, probes).
 *
 * Re-exported from @nestjs/throttler rather than reimplemented: ThrottlerGuard
 * only recognises its own metadata key, so a hand-rolled SetMetadata has no
 * effect on the guard whatsoever.
 */
export { SkipThrottle };
