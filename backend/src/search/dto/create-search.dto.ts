import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { sort } from 'src/enums/sort.enum';

export class CreateSearchDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
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
  limit: number = 10;
}
