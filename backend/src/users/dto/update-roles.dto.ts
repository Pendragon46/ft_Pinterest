import { IsString, IsNotEmpty } from 'class-validator';
import { Role } from 'src/enums/role.enum';

export class UpdateRolesDto {
	@IsString()
	@IsNotEmpty()
	roles!: Role;
}