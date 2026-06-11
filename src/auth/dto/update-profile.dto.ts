import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'new.email@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
