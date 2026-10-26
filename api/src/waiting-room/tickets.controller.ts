import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { QueueService } from './queue.service.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly queue: QueueService) {}

  @Post()
  create(@Body() body: { reason?: unknown } | undefined) {
    return this.queue.createTicket(body?.reason);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.queue.getTicket(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id') id: string): void {
    this.queue.cancelTicket(id);
  }
}
