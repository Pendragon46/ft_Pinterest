import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CreateSearchDto } from './dto/create-search.dto';
import { Public } from 'src/decorators/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  findAll(@Query() query: CreateSearchDto) {
    return this.searchService.findAll(query);
  }

  @Public()
  @Get('artworks')
  findArtwork(@Query() query: CreateSearchDto) {
    return this.searchService.findArtwork(query);
  }

  @Public()
  @Get('users')
  findUser(@Query() query: CreateSearchDto) {
    return this.searchService.findUser(query);
  }

  @Public()
  @Get('tags')
  findTag(@Query() query: CreateSearchDto) {
    return this.searchService.findTag(query);
  }

  // Complète la saisie : renvoie de vrais tags (nom + compteur), pas des œuvres.
  @Public()
  @Get('suggest')
  suggestTags(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.searchService.suggestTags(q ?? '', limit ? Number(limit) : 8);
  }
}
