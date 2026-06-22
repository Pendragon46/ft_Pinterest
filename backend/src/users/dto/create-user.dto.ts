import { IsString, IsInt, IsStrongPassword, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
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
	@IsNotEmpty()
	bio!: string;

	@IsString()
	@IsNotEmpty()
	avatarUrl!: string;
}
