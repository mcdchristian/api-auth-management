import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
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
  ) {}

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

      const hashedPassword = await bcrypt.hash(userData.password, 10);
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
      select: ['id', 'email', 'password', 'role', 'isActive'],
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
      hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    }
    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken as string,
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
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    try {
      await this.usersRepository.update(id, updateData);
      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found after update`);
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
        this.auditService.logUserEvent({
          userId: id,
          userEmail: updatedUser.email,
          action: 'user_updated',
          changes: Object.keys(updateData).reduce((acc, key) => {
            if (key !== 'password') acc[key] = (updateData as any)[key];
            return acc;
          }, {} as any),
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

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, { password: hashedNewPassword });
  }
}
