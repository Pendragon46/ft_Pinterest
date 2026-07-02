import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOneById(@Param('id') id: string) {
	return this.usersService.findOne(id);
  }

  @Get('username/:username')
  findOne(@Param('username') username: string) {
    return this.usersService.findOne(username);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator({ fileType: '(jpg|jpeg|png|gif|webp)' }),
			],
		})) file?: Express.Multer.File){
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('username/:username')
  removebyUsername(@Param('username') username: string) {
    return this.usersService.removebyUsername(username);
  }
  @Delete(':id')
  removebyId(@Param('id') id: string) {
	return this.usersService.removeById(id);
  }

  @Get('search')
  searchUsers(@Query('query') query: string) {
	return this.usersService.searchUsers(query);
  }
}

