import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'new.email@example.com',
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
}
