export const REASONS = [
  { id: 'fievre', label: 'Fièvre' },
  { id: 'renouvellement', label: 'Renouvellement d’ordonnance' },
  { id: 'douleur', label: 'Douleur' },
  { id: 'autre', label: 'Autre' },
] as const;

export type ReasonId = (typeof REASONS)[number]['id'];

export function isReasonId(value: unknown): value is ReasonId {
  return REASONS.some((reason) => reason.id === value);
}
