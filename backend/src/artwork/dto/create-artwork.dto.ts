import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateArtworkDto {
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must be at most 100 characters long' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, {
    message: 'Description must be at most 500 characters long',
  })
  description!: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  mediapublicId?: string;

  // multipart envoie une valeur unique comme string ; on la normalise en tableau
  // pour ne pas faire échouer @IsArray (undefined reste undefined = optionnel).
  @Transform(({ value }) =>
    value === undefined || Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tags?: string[];
}
