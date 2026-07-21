import { Controller, Get, Post, Body, Patch, Param, Delete
	, Req, UseInterceptors, UploadedFile, ParseFilePipe,
	MaxFileSizeValidator, FileTypeValidator, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enums/role.enum';
import { RolesGuard } from 'src/roles/roles.guard';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getCurrentUser(@Req() req) {
	return this.usersService.getCurrentUser(req.user.id);
  }
 
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOneById(@Param('id') id: string) {
	return this.usersService.findOneById(id);
  }

  @Get('username/:username')
  findOne(@Param('username') username: string) {
    return this.usersService.findOneByUsername(username);
  }


  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  update(	@Param('id') id: string, @Body() updateUserDto: UpdateUserDto,
  			@Req() req, @UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
				new FileTypeValidator({ fileType: /(image\/jpg|image\/jpeg|image\/png|image\/webp)/ }),
			],
			fileIsRequired: false,
		})) file?: Express.Multer.File){
    return  this.usersService.update(id,updateUserDto, file, req.user.id);
  }

  @Patch(':id/roles')

  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  updateRoles(@Param('id') id: string, @Body() data: { role: Role}) {
  return this.usersService.updateRoles(id, data.role);
  }

  @Delete(':id')
  removebyId(@Param('id') id: string, @Req() req) {
	return  this.usersService.removeById(id, req.user.id);
  }

  @Get(':id/artworks')
  getUserArtworks(@Param('id') id: string) {
	return this.usersService.getUserArtworks(id);
  }

  @Get(':id/artworks/liked')
  getUserLikedArtworks(@Param('id') id: string) {
	return this.usersService.getUserLikedArtworks(id);
  }
}

