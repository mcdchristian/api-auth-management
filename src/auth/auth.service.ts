import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    // Store the refresh token hash in database
    await this.usersService.updateRefreshToken(user.id, tokens.refresh_token);
    this.logger.log(`User registered: ${user.email}`);
    return tokens;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(
        `Login attempt for deactivated account: ${loginDto.email}`,
      );
      throw new ForbiddenException('Account is deactivated');
    }
    this.logger.log(`User logged in: ${user.email}`);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('jwt.refreshSecret') as string,
        },
      );

      const userId = payload.sub;
      const user = await this.usersService.findByIdWithRefreshToken(userId);
      if (!user || !user.refreshToken) {
        throw new ForbiddenException('Access Denied');
      }

      const refreshTokenMatches = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!refreshTokenMatches) {
        throw new ForbiddenException('Access Denied');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.usersService.updateRefreshToken(user.id, tokens.refresh_token);
      return tokens;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Access Denied');
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessExpiration =
      this.configService.get<string>('jwt.expiration') ?? '15m';
    const refreshExpiration =
      this.configService.get<string>('jwt.refreshExpiration') ?? '7d';

    const [at, rt] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret') as string,
        expiresIn: accessExpiration,
      } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret') as string,
        expiresIn: refreshExpiration,
      } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}
