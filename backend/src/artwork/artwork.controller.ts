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
  @UseInterceptors(FileInterceptor('file'))
  create(
      @Body() createArtworkDto: CreateArtworkDto,
  			@UploadedFile(
		new ParseFilePipe({
			validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator ({ fileType: '(jpg|jpeg|png|gif|webp)' }),
			],
		})) file: Express.Multer.File) {
	return this.artworkService.create(createArtworkDto, file);
  }

  @Get(':tag')
  findAll(@Param('tag') tag: string) {
    return this.artworkService.findAll(tag);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artworkService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  update(	@Param('id') id: string,
  			@Body() updateArtworkDto: UpdateArtworkDto,
			@UploadedFile(
				new ParseFilePipe({
				validators: [
				new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
				new FileTypeValidator({ fileType: '(jpg|jpeg|png|gif|webp)' }),
			],
		})) file?: Express.Multer.File) {
    return this.artworkService.update(id, updateArtworkDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
     this.artworkService.remove(id);
  }
}
