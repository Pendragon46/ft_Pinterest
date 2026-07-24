import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, UseInterceptors, UploadedFile, FileTypeValidator, ParseFilePipe, MaxFileSizeValidator, Req, Request, UseGuards } from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('artworks')
export class ArtworkController {
  constructor(private readonly artworkService: ArtworkService) {}

  // GUEST est en lecture seule : USER/ADMIN pour publier.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Post('user/:id')
  @UsePipes()
  @UseInterceptors(FileInterceptor('art'))
  create(
	@Param('id') id: string, // change to @Request() req and get the user id from the token JWT
      @Body() data: CreateArtworkDto,
  			@UploadedFile(
		new ParseFilePipe({
			validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator ({ fileType: /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/ }),
			],
		})) file: Express.Multer.File) {
	return this.artworkService.create(data, file, id);
  }

//   @Post()
//   @UsePipes()
//   @UseInterceptors(FileInterceptor('art'))
//   create(
//		@Request() req,
//       @Body() data: CreateArtworkDto,
//   			@UploadedFile(
// 		new ParseFilePipe({
// 			validators: [
// 				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
// 				new FileTypeValidator ({ fileType: /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/ }),
// 			],
// 		})) file: Express.Multer.File) {
// 	return this.artworkService.create(data, file, req.user.id);
//   }



  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artworkService.findOne(id);
  }


  @Get('feed/:userId')
  getFeed(@Param('userId') userId: string) {
	return this.artworkService.getFeed(userId);
  }

  // change to @Request() req and get the user id from the token JWT
  @Patch(':id')
  @UseInterceptors(FileInterceptor('art'))
  update(	@Param('id') id: string,
  			@Body() data: UpdateArtworkDto,
			@UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator({ fileType: /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/}),
			],
			fileIsRequired: false,
		})) file?: Express.Multer.File) {
    return this.artworkService.update(id, data, file, data.userId);
  }

//     @Patch(':id')
//   @UseInterceptors(FileInterceptor('art'))
//   update(	@Param('id') id: string,
//				@Request() req,
//   			@Body() data: UpdateArtworkDto,
// 			@UploadedFile(
// 				new ParseFilePipe({
// 				validators: [
// 				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
// 				new FileTypeValidator({ fileType: /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/}),
// 			],
// 			fileIsRequired: false,
// 		})) file?: Express.Multer.File) {
//     return this.artworkService.update(id, data, file, req.user.Id);
//   }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.artworkService.remove(id, req.user.id);
  }

//   @Delete(':id')
//   remove(@Param('id') id: string, @Request() req) {
//     return this.artworkService.remove(id, req.userId);
//   }

  @Delete('deleteall/:userId')
  deleteAllArtworksByUser(@Param('userId') userId: string) {
	return this.artworkService.deleteAllArtworksByUser(userId);
  }

  @Get(':id/likes')
   getLikes(@Param('id') id: string) {
	return  this.artworkService.getArtworkLikes(id);
  }

}
