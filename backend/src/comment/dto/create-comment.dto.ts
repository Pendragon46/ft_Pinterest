import { IsNotEmpty, IsOptional, IsString, Max } from "class-validator";

export class CreateCommentDto {

	@IsString()
	@IsNotEmpty()
	@IsOptional() // delete this property if you are getting the logged-in user's ID from the JWT token in the request
	comment!: string;

	@IsString()
	@IsNotEmpty()
	loggedUser!: string; // Add this property to hold the logged-in user's ID
}
