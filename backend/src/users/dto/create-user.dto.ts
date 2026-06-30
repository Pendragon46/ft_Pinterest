import { IsString, IsInt, IsStrongPassword, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
	@IsString()
	@IsOptional()
	fullname!: string;

	@IsString()
	@IsNotEmpty()
	username!: string;

	@IsString()
	@IsNotEmpty()
	email!: string;


	@IsStrongPassword()
	@IsNotEmpty()
	password!: string;

	@IsString()	
	@IsOptional()
	bio!: string;

	@IsString()
	@IsOptional()
	avatarUrl!: string;

}
