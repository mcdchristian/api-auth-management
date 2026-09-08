import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  const payload: JwtPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const activeUser = {
    id: payload.sub,
    email: payload.email,
    role: UserRole.ADMIN,
    isActive: true,
    password: 'should-not-be-returned',
  };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  it('should return a lean projection of the user', async () => {
    usersService.findById.mockResolvedValue(activeUser);

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: activeUser.id,
      email: activeUser.email,
      role: UserRole.ADMIN,
    });
  });

  it('should not leak the password onto the request', async () => {
    usersService.findById.mockResolvedValue(activeUser);

    const result = await strategy.validate(payload);

    expect(result).not.toHaveProperty('password');
  });

  it('should take the role from the database, not from the token', async () => {
    // A token issued before a demotion still carries the old role. Trusting
    // the claim would leave revoked privileges usable until it expires.
    usersService.findById.mockResolvedValue(activeUser);

    const result = await strategy.validate({
      ...payload,
      role: UserRole.USER,
    });

    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('should reject a token whose user no longer exists', async () => {
    usersService.findById.mockResolvedValue(undefined);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a still-valid token for a deactivated account', async () => {
    usersService.findById.mockResolvedValue({ ...activeUser, isActive: false });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
