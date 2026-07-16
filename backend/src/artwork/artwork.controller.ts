import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, UseInterceptors, UploadedFile, FileTypeValidator, ParseFilePipe, MaxFileSizeValidator, Req, Request } from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';

@Controller('artworks')
export class ArtworkController {
  constructor(private readonly artworkService: ArtworkService) {}

  // @Post() Uncomment this line and comment the next line to use the user id from the token JWT
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



  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artworkService.findOne(id);
  }

  @Get('user/:userId')
  FindAllArtwork(@Param('id') userId : string){
	 return this.artworkService.findAllArtworks(userId)
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

  // change to @Request() req and get the user id from the token JWT
  @Delete(':id')
  remove(@Param('id') id: string, @Body() data: { userId: string }) {
    return this.artworkService.remove(id, data.userId);
  }

  @Delete('deleteall/:userId')
  deleteAllArtworksByUser(@Param('userId') userId: string) {
	return this.artworkService.deleteAllArtworksByUser(userId);
  }

}
