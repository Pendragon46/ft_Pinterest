import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateArtworkDto {
	@IsString()
	title!: string;

	@IsString()
	description!: string;

	@IsString()
	@IsOptional()
	imageUrl?: string;

	@IsString()
	@IsOptional()
	publicId?: string;

}

