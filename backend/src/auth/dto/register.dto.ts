import { IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword, MinLength, MaxLength } from "class-validator";

export class RegisterDto {

	@IsOptional()
	@IsString()
	@MaxLength(50)
	fullname?:	string;

	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(30)
	username:	string;

	@IsEmail()
	@isNotEmpty()
	email:		string;

	@IsStrongPassword()
	@IsNotEmpty()
	password:	string;

	@IsOptional()
	@IsString()
	@MaxLength(280)
	bio?:		string;
}