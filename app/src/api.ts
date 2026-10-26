export interface Reason {
  id: string;
  label: string;
}

export type TicketStatus = 'waiting' | 'called' | 'cancelled';

export interface Ticket {
  id: string;
  reason: string;
  status: TicketStatus;
  position: number | null;
  estimatedWaitMinutes: number | null;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 8_000;

interface RequestOptions {
  method?: 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError('Adresse de l’API non configurée. Vérifiez app/.env.local.');
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const message =
        payload !== null &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof payload.message === 'string'
          ? payload.message
          : `Erreur de l’API (${response.status})`;
      throw new ApiError(message, response.status);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('Le serveur met trop de temps à répondre. Réessayez.');
    }
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

export function getReasons(signal?: AbortSignal): Promise<Reason[]> {
  return request('/reasons', { signal });
}

export function createTicket(reason: string, requestId: string): Promise<Ticket> {
  return request('/tickets', { method: 'POST', body: { reason, requestId } });
}

export function getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  return request(`/tickets/${encodeURIComponent(id)}`, { signal });
}

export function cancelTicket(id: string): Promise<void> {
  return request(`/tickets/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}
