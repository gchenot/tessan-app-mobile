import { Module } from '@nestjs/common';
import { WaitingRoomModule } from './waiting-room/waiting-room.module.js';

@Module({
  imports: [WaitingRoomModule],
})
export class AppModule {}
