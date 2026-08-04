import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { sort } from 'src/enums/sort.enum';

export class CreateSearchDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MaxLength(100, { message: 'Search query must be at most 100 characters long' })
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsEnum(sort)
  sort: sort = sort.RECENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1000)
  limit: number = 10;
}
