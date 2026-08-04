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

const trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  );

export class CreateUserDto {
  @Transform(({ value }) => value?.trim())
  @IsOptional() // for undefined and null values
  @IsNotEmpty() // for empty string
  @IsString()

  @MaxLength(50)
  @trim()
  fullname!: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @trim()
  username!: string;

  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @trim()
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
