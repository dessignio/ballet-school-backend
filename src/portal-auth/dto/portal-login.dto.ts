import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class PortalLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsUUID()
  @IsNotEmpty()
  studioId: string;
}
