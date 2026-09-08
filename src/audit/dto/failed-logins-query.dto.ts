import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';

export class FailedLoginsQueryDto {
  @ApiPropertyOptional({
    description: 'How many hours back to look',
    default: 24,
  })
  @IsOptional()
  @IsInt({ message: 'hours must be an integer' })
  @IsPositive({ message: 'hours must be a positive integer' })
  // A week. Wider windows belong in the paginated /audit/logs endpoint, which
  // does not have to aggregate the whole table to answer.
  @Max(168, { message: 'hours cannot exceed 168 (one week)' })
  @Type(() => Number)
  hours?: number = 24;
}
