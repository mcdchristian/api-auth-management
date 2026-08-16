import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address (must be unique)',
  })
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    minLength: 8,
    description:
      'Password (min 8 chars, must contain uppercase, lowercase, number, and special char)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  // Role is intentionally NOT exposed here.
  // New users always register as UserRole.USER.
  // Role promotion must be done by an admin via PATCH /users/:id.
}
