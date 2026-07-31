import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateArtworkDto {
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must be at most 100 characters long' })
  @Transform(({value}) => value?.trim())
  @IsNotEmpty()
  @IsString()
  title!: string;

  @Transform(({value}) => value?.trim())
  
  @IsOptional()

  @IsString()
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

  // multipart : une valeur unique arrive en string → normalisée en tableau pour @IsArray.
  @Transform(({ value }) =>
    value === undefined || Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(30, { each: true, message: 'Each tag must be at most 50 characters long' })
  tags?: string[];
}
