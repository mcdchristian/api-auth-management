import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
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
  email!: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(128)
  password!: string;
}
