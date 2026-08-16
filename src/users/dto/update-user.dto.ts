import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'john.updated@example.com',
    description: 'User email address (must be unique)',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  email?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'User role (admin only can update)',
  })
  @IsEnum(UserRole, { message: 'Invalid role' })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status of the user',
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
