import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CreateSearchDto } from './dto/create-search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}


  @Get()
  findAll(@Query() query: CreateSearchDto) {
	return this.searchService.findAll(query);
  }

  @Get('artworks')
  findArtwork(@Query() query: CreateSearchDto) {
    return this.searchService.findArtwork(query);
  }

  @Get('users')
  findUser(@Query() query: CreateSearchDto) {
	return this.searchService.findUser(query);
  }

  @Get('tags')
  findTag(@Query() query: CreateSearchDto) {
	return this.searchService.findTag(query);
  }
}
