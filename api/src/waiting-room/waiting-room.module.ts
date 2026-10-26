import { Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { ReasonsController } from './reasons.controller.js';
import { TicketsController } from './tickets.controller.js';

@Module({
  controllers: [ReasonsController, TicketsController],
  providers: [QueueService],
})
export class WaitingRoomModule {}
