import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, {message : 'Comment must be at least 3 characters long'})
  @MaxLength(500, {message : 'Comment must be at most 500 characters long'})
  comment!: string;
}
