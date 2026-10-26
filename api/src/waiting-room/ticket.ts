import type { ReasonId } from './reasons.js';

export const TICKET_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  CANCELLED: 'cancelled',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export interface Ticket {
  id: string;
  reason: ReasonId;
  status: TicketStatus;
  position: number | null;
  estimatedWaitMinutes: number | null;
}
