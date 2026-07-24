import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateArtworkDto {
	@MinLength(3, { message: 'Title must be at least 3 characters long' })
	@MaxLength(100, { message: 'Title must be at most 100 characters long' })
	@IsString()
	@IsNotEmpty()
	title!: string ;

	@IsString()
	@IsOptional()
	@MaxLength(2000, { message: 'Description must be at most 500 characters long' })
	description!: string;

	@IsString()
	@IsOptional()
	mediaUrl?: string;

	@IsString()
	@IsOptional()
	mediapublicId?: string;

	// multipart repeats the `tags` key; a SINGLE tag arrives as a string, not an
	// array. Coerce it so one-tag uploads still pass @IsArray.
	@Transform(({ value }) =>
		Array.isArray(value) ? value : value === undefined ? value : [value],
	)
	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	tags?: string[];

//delete this property if you are getting the logged-in user's ID from the JWT token in the request
	@IsOptional()
	@IsString()
	userId!: string; // Add this property to hold the logged-in user's ID
}

