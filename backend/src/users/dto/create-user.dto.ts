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
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @trim()
  fullname!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @trim()
  username!: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @trim()
  email!: string;

  @IsStrongPassword()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
  @MaxLength(280)
  @trim()
  bio!: string;

  @IsString()
  @IsOptional()
  avatarUrl!: string;

  @IsString()
  @IsOptional()
  avatarPublicId!: string;
}
