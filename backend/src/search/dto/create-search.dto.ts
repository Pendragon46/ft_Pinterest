import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { sort } from 'src/enums/sort.enum';

export class CreateSearchDto {
  @IsString()
  @IsOptional()
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page: number = 1;

  @IsEnum(sort)
  @IsOptional()
  sort: sort = sort.RECENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit: number = 10;
}
