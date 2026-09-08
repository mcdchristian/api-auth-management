import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MANAGER = 'manager',
}

@Entity('users')
// Uniqueness applies to live rows only. A plain UNIQUE column would keep a
// soft-deleted user's address reserved forever: nobody could register with it
// again, and the row it belongs to is no longer reachable through the API.
@Index('UQ_users_email_active', ['email'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @Column()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @Column({ select: false }) // Don't return password by default
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @ApiProperty({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  @ApiProperty({ example: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  @Exclude()
  refreshToken: string | null;

  /**
   * Consecutive failed login attempts since the last success. Reset to 0 on a
   * successful login and used to trigger a temporary lockout.
   */
  @Column({ type: 'int', default: 0, select: false })
  @Exclude()
  failedLoginAttempts: number;

  /**
   * Instant until which authentication is refused for this account. Null when
   * the account is not locked.
   */
  @Column({ type: 'timestamp with time zone', nullable: true, select: false })
  @Exclude()
  lockedUntil: Date | null;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedAt?: Date;
}
