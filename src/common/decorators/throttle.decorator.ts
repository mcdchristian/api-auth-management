import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

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
 * Skip throttling for public endpoints (health check, etc.)
 */
export const SkipThrottle = SetMetadata('skip-throttle', true);
