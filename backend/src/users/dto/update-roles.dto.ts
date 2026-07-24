import { IsEnum } from 'class-validator';
import { Role } from 'src/enums/role.enum';

export class UpdateRolesDto {
	@IsEnum(Role, { message: 'role must be USER, GUEST or ADMIN' })
	role!: Role;
}
