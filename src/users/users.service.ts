import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AuditService } from '../common/services/audit.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {}

  /**
   * bcrypt work factor, read from configuration so it can be tuned per
   * environment without touching every call site.
   */
  private get bcryptRounds(): number {
    return this.configService.get<number>('security.bcryptRounds') ?? 12;
  }

  private hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.bcryptRounds);
  }

  async create(userData: Partial<User>): Promise<User> {
    try {
      const existingUser = await this.usersRepository.findOne({
        where: { email: userData.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      if (!userData.password) {
        throw new BadRequestException('Password is required');
      }

      const hashedPassword = await this.hashPassword(userData.password);
      const user = this.usersRepository.create({
        ...userData,
        password: hashedPassword,
      });

      const savedUser = await this.usersRepository.save(user);

      this.auditService.logUserEvent({
        userId: savedUser.id,
        userEmail: savedUser.email,
        action: 'user_created',
        status: 'success',
      });

      return savedUser;
    } catch (error) {
      this.auditService.logUserEvent({
        userId: 'new',
        userEmail: userData.email || 'unknown',
        action: 'user_created',
        status: 'failure',
      });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'role',
        'isActive',
        'failedLoginAttempts',
        'lockedUntil',
      ],
    });
    return user ?? undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
    });
    return user ?? undefined;
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    let hashedRefreshToken: string | null = null;
    if (refreshToken) {
      hashedRefreshToken = await this.hashPassword(refreshToken);
    }
    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async findByIdWithRefreshToken(id: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'role', 'refreshToken'],
    });
    return user ?? undefined;
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.usersRepository.findAndCount({
      select: ['id', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const emailBefore = user.email;
    const roleBefore = user.role;

    // Check for email uniqueness if email is being changed
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser) {
        this.auditService.logUserEvent({
          userId: id,
          userEmail: emailBefore,
          action: 'user_updated',
          status: 'failure',
        });
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if it's being updated
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }

    try {
      await this.usersRepository.update(id, updateData);
      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new NotFoundException(
          `User with ID ${id} not found after update`,
        );
      }

      // Check if role changed
      if (updateData.role && updateData.role !== roleBefore) {
        this.auditService.logUserEvent({
          userId: id,
          userEmail: updatedUser.email,
          action: 'role_changed',
          changes: { from: roleBefore, to: updateData.role },
          status: 'success',
        });
      } else {
        const changes: Record<string, unknown> = {};
        for (const key of Object.keys(updateData)) {
          if (key !== 'password') {
            changes[key] = (updateData as Record<string, unknown>)[key];
          }
        }
        this.auditService.logUserEvent({
          userId: id,
          userEmail: updatedUser.email,
          action: 'user_updated',
          changes,
          status: 'success',
        });
      }

      return updatedUser;
    } catch (error) {
      this.auditService.logUserEvent({
        userId: id,
        userEmail: emailBefore,
        action: 'user_updated',
        status: 'failure',
      });
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    try {
      await this.usersRepository.softDelete(id);
      this.auditService.logUserEvent({
        userId: id,
        userEmail: user.email,
        action: 'user_deleted',
        status: 'success',
      });
    } catch (error) {
      this.auditService.logUserEvent({
        userId: id,
        userEmail: user.email,
        action: 'user_deleted',
        status: 'failure',
      });
      throw error;
    }
  }

  /**
   * Bring a soft-deleted account back.
   *
   * Deleting no longer reserves the address, so it may have been claimed in
   * the meantime. Restoring into that collision would leave two live accounts
   * on one email, which the partial unique index rejects at the database
   * level — this reports it as a conflict rather than letting it surface as a
   * constraint violation.
   */
  async restore(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      withDeleted: true,
      select: ['id', 'email', 'role', 'isActive', 'deletedAt'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (!user.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    const holder = await this.usersRepository.findOne({
      where: { email: user.email },
      select: ['id'],
    });
    if (holder) {
      this.auditService.logUserEvent({
        userId: id,
        userEmail: user.email,
        action: 'user_restored',
        status: 'failure',
      });
      throw new ConflictException(
        `Cannot restore: ${user.email} now belongs to an active account`,
      );
    }

    await this.usersRepository.restore(id);
    this.auditService.logUserEvent({
      userId: id,
      userEmail: user.email,
      action: 'user_restored',
      status: 'success',
    });

    const restored = await this.findById(id);
    if (!restored) {
      throw new NotFoundException(`User with ID ${id} not found after restore`);
    }
    return restored;
  }

  /**
   * Record one failed login for a user and lock the account once the
   * configured threshold is reached.
   *
   * @returns the instant the lockout expires, or null if not locked.
   */
  async registerFailedLogin(user: User): Promise<Date | null> {
    const maxAttempts =
      this.configService.get<number>('security.maxFailedLoginAttempts') ?? 5;
    const lockoutMs =
      this.configService.get<number>('security.lockoutDurationMs') ?? 900_000;

    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const lockedUntil =
      attempts >= maxAttempts ? new Date(Date.now() + lockoutMs) : null;

    await this.usersRepository.update(user.id, {
      failedLoginAttempts: attempts,
      lockedUntil,
    });

    if (lockedUntil) {
      this.logger.warn(
        `Account locked until ${lockedUntil.toISOString()} after ${attempts} failed login attempts: ${user.email}`,
      );
    }

    return lockedUntil;
  }

  /**
   * Clear the failed-attempt counter after a successful authentication.
   * Skipped when there is nothing to clear, to avoid a write on every login.
   */
  async clearFailedLogins(user: User): Promise<void> {
    if (!user.failedLoginAttempts && !user.lockedUntil) {
      return;
    }
    await this.usersRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Change password for an authenticated user.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Need to fetch the user WITH the password field
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.usersRepository.update(userId, { password: hashedNewPassword });
  }
}
