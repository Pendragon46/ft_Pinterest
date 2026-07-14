import { IsNotEmpty, IsString, Max } from "class-validator";

export class CreateCommentDto {

	@IsString()
	@IsNotEmpty()
	comment!: string;
}
