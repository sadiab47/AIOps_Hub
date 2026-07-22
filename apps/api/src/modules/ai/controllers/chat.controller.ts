import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  Req,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ConversationService } from '../services/conversation.service';
import { ChatOrchestrator } from '../services/chat-orchestrator.service';

@ApiTags('Chat Engine')
@ApiCookieAuth('aiops_access_token')
@ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
@Controller('chat/conversations')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class ChatController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly orchestrator: ChatOrchestrator,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat conversation thread' })
  @ApiResponse({ status: 201, description: 'Conversation thread created successfully.' })
  async create(
    @TenantId() orgId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all conversations in active organization' })
  @ApiResponse({ status: 200, description: 'Conversations list.' })
  async list(@TenantId() orgId: string) {
    return this.conversationService.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details and full message history' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Conversation details.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  async getOne(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationService.getOne(orgId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete conversation thread' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully.' })
  async delete(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.conversationService.delete(orgId, id);
    return { message: 'Conversation deleted successfully' };
  }

  @Post(':id/stream')
  @Throttle({ chat: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open real-time token stream (SSE) for prompt message' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Token stream connection established.' })
  async stream(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const requestId = crypto.randomUUID();

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const correlation = {
      userId: actorId,
      organizationId: orgId,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };

    const stream = this.orchestrator.streamMessage(orgId, id, actorId, dto, requestId, correlation);

    // Track client disconnect (cancellation signal)
    let isClosed = false;
    req.on('close', () => {
      isClosed = true;
    });

    try {
      for await (const chunk of stream) {
        if (isClosed) {
          // If connection is closed, trigger Abort exception in generator loop
          throw new Error('aborted');
        }
        res.write(`event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`);
      }
    } catch (err: any) {
      if (err.message === 'aborted') {
        // Log cancellation
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ code: 'SERVER_ERROR', message: err.message })}\n\n`);
      }
    } finally {
      res.end();
    }
  }
}
