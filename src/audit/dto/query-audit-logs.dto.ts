import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import type { AuditStatus } from '../entities/audit-log.entity';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ example: 'login', description: 'Exact action name' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @ApiPropertyOptional({ enum: ['success', 'failure'] })
  @IsOptional()
  @IsIn(['success', 'failure'], {
    message: 'status must be either success or failure',
  })
  status?: AuditStatus;

  @ApiPropertyOptional({ description: 'Subject of the event' })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a UUID' })
  userId?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'userEmail must be an email' })
  @MaxLength(255)
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Inclusive lower bound, ISO 8601',
    example: '2026-09-01T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'from must be a valid ISO 8601 date' })
  from?: Date;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound, ISO 8601',
    example: '2026-09-30T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'to must be a valid ISO 8601 date' })
  to?: Date;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @IsPositive({ message: 'Page must be a positive integer' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @IsPositive({ message: 'Limit must be a positive integer' })
  @Max(200, { message: 'Limit cannot exceed 200' })
  @Type(() => Number)
  limit?: number = 50;
}
