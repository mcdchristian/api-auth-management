import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type AuditStatus = 'success' | 'failure';

/**
 * Durable record of a security-sensitive operation.
 *
 * Rows are written on the authentication and user-management paths and are
 * never updated afterwards — an audit trail that can be edited in place is
 * not evidence of anything.
 */
@Entity('audit_logs')
// Newest-first listing, which is what every read of this table does.
@Index('IDX_audit_logs_timestamp', ['timestamp'])
// Covers the failed-login summary: action + status + a time window.
@Index('IDX_audit_logs_action_status_timestamp', [
  'action',
  'status',
  'timestamp',
])
@Index('IDX_audit_logs_user_id', ['userId'])
// "what did this admin do?" is the other half of an accountability trail.
@Index('IDX_audit_logs_performed_by', ['performedBy'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty()
  timestamp: Date;

  @Column({ type: 'varchar', nullable: true })
  @ApiPropertyOptional({ description: 'Subject of the event, when known' })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  userEmail: string | null;

  @Column()
  @ApiProperty({ example: 'login' })
  action: string;

  @Column()
  @ApiProperty({ example: 'auth', enum: ['auth', 'user'] })
  resourceType: string;

  @Column({ type: 'varchar', nullable: true })
  @ApiPropertyOptional()
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  @ApiPropertyOptional({ description: 'Field-level diff, passwords excluded' })
  changes: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  @ApiPropertyOptional({ example: '203.0.113.7' })
  ipAddress: string | null;

  /**
   * Who carried the action out, as opposed to `userId`, which is who it was
   * carried out on. Null for self-service actions and for anything the system
   * does on its own behalf.
   *
   * Stored as a plain id rather than a foreign key: an audit row has to stay
   * readable after the acting account is deleted, and a cascade or a
   * restrict would either erase the evidence or block the deletion.
   */
  @Column({ type: 'varchar', nullable: true })
  @ApiPropertyOptional({ description: 'Acting user id, when not self-service' })
  performedBy: string | null;

  /**
   * Denormalised on purpose. The id alone needs a join to mean anything, and
   * the account it points at may be gone by the time anyone reads the row.
   */
  @Column({ type: 'varchar', nullable: true })
  @ApiPropertyOptional({ example: 'admin@example.com' })
  performedByEmail: string | null;

  @Column({ type: 'varchar' })
  @ApiProperty({ enum: ['success', 'failure'] })
  status: AuditStatus;

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({ example: 'Invalid credentials' })
  reason: string | null;
}
