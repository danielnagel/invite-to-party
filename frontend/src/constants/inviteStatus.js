// Mirrors the backend's `invites.status` check constraint (see
// backend/migrations for the exact values) - stored as-is in the database.
export const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
};

export function statusLabel(value) {
  return STATUS_LABELS[value] ?? value;
}
