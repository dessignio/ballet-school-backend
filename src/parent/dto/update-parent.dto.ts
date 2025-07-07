// src/parent/dto/update-parent.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateParentDto } from './create-parent.dto';
import { IsOptional, MinLength, IsString } from 'class-validator';

export class UpdateParentDto extends PartialType(CreateParentDto) {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;
}
