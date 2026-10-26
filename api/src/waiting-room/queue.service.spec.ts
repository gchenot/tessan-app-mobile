import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { TICKET_STATUS } from './ticket.js';

describe('QueueService', () => {
  let queue: QueueService;

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new QueueService();
    queue.onModuleInit();
  });

  afterEach(() => {
    queue.onModuleDestroy();
    vi.useRealTimers();
  });

  it('moves a new patient through the seeded queue every 20 seconds', () => {
    const ticket = queue.createTicket('fievre');
    expect(ticket).toMatchObject({
      status: TICKET_STATUS.WAITING,
      position: 4,
      estimatedWaitMinutes: 20,
    });

    vi.advanceTimersByTime(20_000);
    expect(queue.getTicket(ticket.id)).toMatchObject({
      position: 3,
      estimatedWaitMinutes: 15,
    });

    vi.advanceTimersByTime(60_000);
    expect(queue.getTicket(ticket.id)).toMatchObject({
      status: TICKET_STATUS.CALLED,
      position: null,
      estimatedWaitMinutes: null,
    });
    expect(() => queue.cancelTicket(ticket.id)).toThrow(ConflictException);
  });

  it('closes a waiting ticket and moves the following patient forward', () => {
    const first = queue.createTicket('douleur');
    const second = queue.createTicket('autre');

    queue.cancelTicket(first.id);
    expect(queue.getTicket(first.id).status).toBe(TICKET_STATUS.CANCELLED);
    expect(queue.getTicket(first.id).position).toBeNull();
    expect(queue.getTicket(second.id).position).toBe(4);
    expect(() => queue.cancelTicket(first.id)).toThrow(ConflictException);
  });

  it('rejects unknown reasons and unknown tickets', () => {
    expect(() => queue.createTicket('inconnu')).toThrow(BadRequestException);
    expect(() => queue.getTicket('missing')).toThrow(NotFoundException);
  });
});
