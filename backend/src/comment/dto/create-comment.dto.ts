import { IsNotEmpty, IsOptional, IsString, Max } from "class-validator";

export class CreateCommentDto {

	@IsString()
	@IsNotEmpty()
	@IsOptional() // delete this property if you are getting the logged-in user's ID from the JWT token in the request
	comment!: string;

	@IsString()
	@IsOptional() // identity now comes from the JWT (req.user.id); kept optional for back-compat
	loggedUser?: string;
}
