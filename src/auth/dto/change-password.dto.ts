import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, must contain uppercase, lowercase, number, and special char)',
    example: 'NewSecurePass456!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
