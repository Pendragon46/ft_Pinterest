import {
  IsString,
  IsStrongPassword,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @Transform(({ value }) => value?.trim())
  @IsOptional() // for undefined and null values
  @IsNotEmpty() // for empty string
  @IsString()

  @MaxLength(50)
  fullname!: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsStrongPassword()
  @IsNotEmpty()
  password!: string;
  
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl!: string;

  @IsString()
  @IsOptional()
  avatarPublicId!: string;
}
