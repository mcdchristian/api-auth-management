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
