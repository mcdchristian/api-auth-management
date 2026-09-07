import type { Request } from 'express';
import { UserRole } from '../../users/entities/user.entity';

/**
 * JWT token payload structure.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user object attached to the request by JwtStrategy.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Express request after JwtAuthGuard has run. `user` is what
 * JwtStrategy.validate returns — a lean projection, not a User entity.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
