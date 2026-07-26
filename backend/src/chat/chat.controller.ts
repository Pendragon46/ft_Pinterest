import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  getConversations(@Req() req) {
    return this.chat.getConversations(req.user.id);
  }

  @Post()
  open(@Body() dto: CreateConversationDto, @Req() req) {
    return this.chat.openConversation(req.user.id, dto.userId);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req,
  ) {
    return this.chat.getMessages(
      req.user.id,
      id,
      Number(page) || 1,
      Number(limit) || 30,
    );
  }

  @Post(':id/messages')
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
    @Req() req,
  ) {
    return this.chat.sendMessage(req.user.id, id, dto);
  }

  @Post(':id/read')
  read(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.chat.markRead(req.user.id, id);
  }
}
