import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
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

  // Bounded so an anonymous caller cannot ask for the whole table in one query.
  // 1000 rather than something smaller because the app itself asks for 1000 when
  // counting artworks and when filling the admin table.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1000)
  limit: number = 10;
}
