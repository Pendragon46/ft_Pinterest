import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, UseInterceptors, UploadedFile, FileTypeValidator, ParseFilePipe, MaxFileSizeValidator, Req, Request } from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';

@Controller('artwork')
export class ArtworkController {
  constructor(private readonly artworkService: ArtworkService) {}

  @Post()
  @UsePipes()
  @UseInterceptors(FileInterceptor('art'))
  create(
      @Body() data: CreateArtworkDto,
  			@UploadedFile(
		new ParseFilePipe({
			validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator ({ fileType: /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/ }),
			],
		})) file: Express.Multer.File) {
	return this.artworkService.create(data, file);
  }


  @Get('/artworks/user/:userId')
  findAllArtworks(@Param('userId') userId: string)
  {
	return this.artworkService.findAllArtworks(userId);
  }



  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artworkService.findOne(id);
  }

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
    return this.artworkService.update(id, data, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
     this.artworkService.remove(id);
  }

  @Delete('/delete/:userid')
  deleteAllArtworksByUser(@Param('userid') userId: string) {
	return this.artworkService.deleteAllArtworksByUser(userId);
	  }
}
