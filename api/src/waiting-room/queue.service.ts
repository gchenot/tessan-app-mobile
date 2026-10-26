import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isReasonId, type ReasonId } from './reasons.js';
import { TICKET_STATUS, type Ticket, type TicketStatus } from './ticket.js';

const CALL_INTERVAL_MS = 20_000;
const INITIAL_QUEUE_LENGTH = 3;
const DEFAULT_AVERAGE_CONSULTATION_MINUTES = 5;

interface StoredTicket {
  id: string;
  reason: ReasonId;
  status: TicketStatus;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly tickets = new Map<string, StoredTicket>();
  private readonly waitingOrder: string[] = [];
  private readonly createdByRequest = new Map<string, string>();
  private readonly averageConsultationMinutes: number;
  private callTimer?: ReturnType<typeof setInterval>;

  constructor() {
    const configuredAverage = Number(
      process.env.AVERAGE_CONSULTATION_MINUTES ??
        DEFAULT_AVERAGE_CONSULTATION_MINUTES,
    );
    if (!Number.isFinite(configuredAverage) || configuredAverage <= 0) {
      throw new Error('AVERAGE_CONSULTATION_MINUTES must be a positive number');
    }
    this.averageConsultationMinutes = configuredAverage;

    for (let index = 0; index < INITIAL_QUEUE_LENGTH; index += 1) {
      const id = `seed-${index + 1}`;
      this.tickets.set(id, {
        id,
        reason: 'autre',
        status: TICKET_STATUS.WAITING,
      });
      this.waitingOrder.push(id);
    }
  }

  onModuleInit(): void {
    this.callTimer = setInterval(() => this.advanceQueue(), CALL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.callTimer) clearInterval(this.callTimer);
  }

  createTicket(reason: unknown, requestId?: unknown): Ticket {
    if (!isReasonId(reason)) {
      throw new BadRequestException('Motif absent ou inconnu');
    }
    let idempotencyKey: string | undefined;
    if (requestId !== undefined) {
      if (
        typeof requestId !== 'string' ||
        requestId.length === 0 ||
        requestId.length > 100
      ) {
        throw new BadRequestException('Identifiant de requête invalide');
      }
      idempotencyKey = requestId;
    }

    if (idempotencyKey) {
      const existingId = this.createdByRequest.get(idempotencyKey);
      if (existingId) {
        const existingTicket = this.getTicket(existingId);
        if (existingTicket.reason !== reason) {
          throw new ConflictException('Identifiant de requête déjà utilisé');
        }
        return existingTicket;
      }
    }

    const id = randomUUID();
    this.tickets.set(id, { id, reason, status: TICKET_STATUS.WAITING });
    this.waitingOrder.push(id);
    if (idempotencyKey) {
      this.createdByRequest.set(idempotencyKey, id);
    }
    return this.getTicket(id);
  }

  getTicket(id: string): Ticket {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }

    const position =
      ticket.status === TICKET_STATUS.WAITING
        ? this.waitingOrder.indexOf(id) + 1
        : null;

    return {
      ...ticket,
      position,
      estimatedWaitMinutes:
        position === null ? null : position * this.averageConsultationMinutes,
    };
  }

  cancelTicket(id: string): void {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    if (ticket.status !== TICKET_STATUS.WAITING) {
      throw new ConflictException('Ce ticket ne peut plus quitter la file');
    }

    this.waitingOrder.splice(this.waitingOrder.indexOf(id), 1);
    ticket.status = TICKET_STATUS.CANCELLED;
  }

  private advanceQueue(): void {
    const nextId = this.waitingOrder.shift();
    const nextTicket = nextId ? this.tickets.get(nextId) : undefined;
    if (nextTicket) {
      nextTicket.status = TICKET_STATUS.CALLED;
    }
  }
}
