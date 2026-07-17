import { IsString, IsStrongPassword, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEmail } from 'class-validator';

export class CreateUserDto {
	@IsString()
	@IsOptional()

	fullname!: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(30)
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
	@MaxLength(280)
	bio!: string;

	@IsString()
	@IsOptional()
	avatarUrl!: string;

	@IsString()
	@IsOptional()
	avatarPublicId!: string;



}