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

// Trim AVANT les validateurs de longueur : des espaces de fin ne doivent pas
// consommer le quota MaxLength ni faire passer une chaîne vide. Vide → null,
// comme côté client (SettingsPage fait déjà bio.trim() || null).
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
