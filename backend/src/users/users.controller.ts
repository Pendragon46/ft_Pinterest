import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enums/role.enum';
import { log } from 'console';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('avatar'))
  // create(@body() createUserdto: CreateUserDto)
  create(@Body() createUserDto: CreateUserDto, @UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator({ fileType: /(image\/jpg|image\/jpeg|image\/png|image\/webp)/ }),
			],
			fileIsRequired: false,
		})) file?: Express.Multer.File) {
    return this.usersService.create(createUserDto, file);
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
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
				new FileTypeValidator({ fileType: /(image\/jpg|image\/jpeg|image\/png|image\/webp)/ }),
			],
			fileIsRequired: false,
		})) file?: Express.Multer.File){
    return  this.usersService.update(id,updateUserDto, file, "34131762-f416-40a9-98fb-95725479dff3");
  }

  @Patch(':id/roles')
  @Roles(Role.admin)
  updateRoles(@Param('id') id: string, @Body() data: { role: Role}) {
  return this.usersService.updateRoles(id, data.role);
  }

  @Delete(':id')
  removebyId(@Param('id') id: string) {
	return  this.usersService.removeById(id, "34131762-f416-40a9-98fb-95725479dff3");
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

