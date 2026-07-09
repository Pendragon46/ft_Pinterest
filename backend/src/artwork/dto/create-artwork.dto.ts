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

}

