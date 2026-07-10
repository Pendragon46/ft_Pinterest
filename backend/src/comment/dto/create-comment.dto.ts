import { IsNotEmpty, IsString, Max } from "class-validator";

export class CreateCommentDto {

	@IsString()
	@IsNotEmpty()
	@Max(500, { message: 'Comment must be less than 500 characters'})
	comment!: string;

	//delete this property if you are getting the logged-in user's ID from the JWT token in the request
	loggedUser!: string; // Add this property to hold the logged-in user's ID
}
