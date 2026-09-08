import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const contextFor = (user?: AuthenticatedUser) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  const admin: AuthenticatedUser = {
    id: 'a',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };
  const plain: AuthenticatedUser = {
    id: 'u',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const requireRoles = (roles?: UserRole[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow a route that declares no roles', () => {
    requireRoles(undefined);

    expect(guard.canActivate(contextFor(plain))).toBe(true);
  });

  it('should allow a user holding the required role', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(admin))).toBe(true);
  });

  it('should deny a user without the required role', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(plain))).toBe(false);
  });

  it('should allow a user matching any one of several required roles', () => {
    requireRoles([UserRole.ADMIN, UserRole.MANAGER]);

    expect(
      guard.canActivate(contextFor({ ...plain, role: UserRole.MANAGER })),
    ).toBe(true);
  });

  it('should deny when the request carries no user at all', () => {
    // Reached if the route is decorated with @Roles but not JwtAuthGuard.
    // Failing open here would expose every admin route anonymously.
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(undefined))).toBe(false);
  });
});
