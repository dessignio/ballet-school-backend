import { IsString, IsNotEmpty } from 'class-validator';

export class PortalLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
