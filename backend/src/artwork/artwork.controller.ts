import {
  Controller,
  UseGuards,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  UploadedFile,
  FileTypeValidator,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { Role } from 'src/enums/role.enum';

@Controller('artworks')
export class ArtworkController {
  constructor(private readonly artworkService: ArtworkService) {}
  @Post()
  @UseInterceptors(FileInterceptor('art'))
  create(
    @Req() req,
    @Body() data: CreateArtworkDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
          new FileTypeValidator({
            fileType:
              /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.artworkService.create(data, file, req.user.id);
  }

  @Public()
  @Get()
  findAll() {
    return this.artworkService.findAll();
  }

  @Get('feed')
  getFeed(@Req() req) {
    return this.artworkService.getFeed(req.user.id);
  }

  @Public()
  @Get(':id/likes')
  getLikes(@Param('id') id: string) {
    return this.artworkService.getArtworkLikes(id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artworkService.findOne(id);
  }

  @Patch(':artworkId')
  @Roles(Role.user, Role.admin)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('art'))
  update(
    @Param('artworkId') artworkId: string,
    @Req() req,
    @Body() data: UpdateArtworkDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
          new FileTypeValidator({
            fileType:
              /(image\/jpeg|image\/png|image\/gif|image\/webp|video\/mp4)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    const user = { id: req.user.id, role: req.user.role };
    return this.artworkService.update(artworkId, data, user, file);
  }

  @Delete(':id')
  @Roles(Role.user, Role.admin)
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @Req() req) {
    return this.artworkService.remove(id, req.user.id);
  }

  @Delete('deleteall/:userId')
  @Roles(Role.user, Role.admin)
  @UseGuards(RolesGuard)
  deleteAllArtworksByUser(@Param('userId') userId: string, @Req() req) {
    return this.artworkService.deleteAllArtworksByUser(userId, req.user.id);
  }
}
