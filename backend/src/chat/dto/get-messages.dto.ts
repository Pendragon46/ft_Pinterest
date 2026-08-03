import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';

// Bounds the raw `?page=`/`?limit=` query so a negative page (negative Prisma
// `skip` → runtime 500) or a huge limit can't reach the database.
export class GetMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limit: number = 30;
}
