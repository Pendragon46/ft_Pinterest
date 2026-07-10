import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateArtworkDto {
	@IsString()
	@IsNotEmpty()
	title!: string;

	@IsString()
	@IsNotEmpty()
	description!: string;

	@IsString()
	@IsOptional()
	mediaUrl?: string;

	@IsString()
	@IsOptional()
	mediapublicId?: string;

	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	tags?: string[];

//delete this property if you are getting the logged-in user's ID from the JWT token in the request
	userId!: string; // Add this property to hold the logged-in user's ID
}

