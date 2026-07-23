import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Role } from 'src/enums/role.enum';

export class UpdateRolesDto {
  @IsEnum(Role, { message: 'Invalid role' })
  @IsString()
  @IsNotEmpty()
  role!: Role;
}
