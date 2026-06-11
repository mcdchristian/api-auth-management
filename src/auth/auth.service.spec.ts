import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUsersService = () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByIdWithRefreshToken: jest.fn(),
  updateRefreshToken: jest.fn(),
  changePassword: jest.fn(),
});

const mockJwtService = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.expiration': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiration': '7d',
    };
    return config[key];
  }),
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: ReturnType<typeof mockUsersService>;
  let jwtService: ReturnType<typeof mockJwtService>;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    role: UserRole.USER,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useFactory: mockUsersService },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return tokens', async () => {
      usersService.create.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      // Verify that refresh token IS stored in DB (bug fix validation)
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'refresh-token',
      );
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for deactivated user', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token and return success message', async () => {
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout(mockUser.id);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        null,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      usersService.findByIdWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshToken: '$2b$10$hashedRefreshToken',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
    });

    it('should throw ForbiddenException for invalid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      usersService.findByIdWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshToken: '$2b$10$hashedRefreshToken',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user has no stored refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      usersService.findByIdWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refreshTokens('any-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if JWT verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('changePassword', () => {
    it('should delegate to usersService.changePassword', async () => {
      usersService.changePassword.mockResolvedValue(undefined);

      const result = await service.changePassword(
        mockUser.id,
        'oldpass',
        'newpass',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        'oldpass',
        'newpass',
      );
    });
  });
});
