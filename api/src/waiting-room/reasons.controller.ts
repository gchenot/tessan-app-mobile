import { Controller, Get } from '@nestjs/common';
import { REASONS } from './reasons.js';

@Controller('reasons')
export class ReasonsController {
  @Get()
  getReasons() {
    return REASONS;
  }
}
