import { IsString, IsStrongPassword, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateUserDto {
	@IsString()
	@IsOptional()
	fullname!: string;

	@IsString()
	@IsNotEmpty()
	username!: string;

 	@IsString()
	@IsEmail()
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

	@IsString()
	@IsOptional()
	avatarPublicId!: string;



	@IsString()
	@IsOptional()
	loggedUser!: string; // Add this property to hold the logged-in user's ID
}