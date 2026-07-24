import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enums/role.enum';
import { UpdateRolesDto } from './dto/update-roles.dto';

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

 
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // RGPD — export de ses propres données. AVANT @Get(':id') sinon Nest ferait
  // correspondre "me" au paramètre :id.
  @UseGuards(JwtAuthGuard)
  @Get('me/export')
  exportMyData(@Request() req: { user: { id: string } }) {
    return this.usersService.exportUserData(req.user.id);
  }

  @Get(':id')
  findOneById(@Param('id') id: string) {
	return this.usersService.findOneById(id);
  }

  @Get('username/:username')
  findOne(@Param('username') username: string) {
    return this.usersService.findOneByUsername(username);
  }


  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: { user: { id: string } }, @UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
				new FileTypeValidator({ fileType: /(image\/jpg|image\/jpeg|image\/png|image\/webp)/ }),
			],
			fileIsRequired: false,
		})) file?: Express.Multer.File){
    return  this.usersService.update(id,updateUserDto, file, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Patch(':id/roles')
  updateRoles(@Param('id') id: string, @Body() data: UpdateRolesDto, @Request() req: { user: { id: string } }) {
  return this.usersService.updateRoles(id, data.role, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removebyId(@Param('id') id: string, @Request() req: { user: { id: string } }) {
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

