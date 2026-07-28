import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCommentDto {
  @Transform(({value}) => value?.trim())
  @IsNotEmpty()
  @IsString()
  @MinLength(3, {message : 'Comment must be at least 3 characters long'})
  @MaxLength(500, {message : 'Comment must be at most 500 characters long'})
  comment!: string;
}
