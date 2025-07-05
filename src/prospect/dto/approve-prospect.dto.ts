// src/prospect/dto/approve-prospect.dto.ts
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ProgramName } from '../../program/types/program-name.type';
import { DancerLevelName } from '../../program/types/dancer-level-name.type';

export class ApproveProspectDto {
  @IsString()
  @IsNotEmpty()
  program: ProgramName;

  @IsOptional()
  @IsString()
  dancerLevel?: DancerLevelName;
}
