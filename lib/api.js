import { db, failure, json } from '@/lib/db';
import { prescription, statuses } from '@/lib/orders';

export const clean = (value) => String(value ?? '').trim();
export const noStore = { headers: { 'Cache-Control': 'no-store' } };

export function validStatus(value) {
  return statuses.includes(value);
}

export function failureFor(error, fallback = 'Server error') {
  console.error(error);
  return failure(error?.message || fallback, 500);
}

export async function nextOrderNumber(kind) {
  const rows = await db()`UPDATE order_counters SET current_value = current_value + 1 WHERE kind=${kind} RETURNING current_value`;
  if (!rows[0]) throw new Error('Order counter is not initialized.');
  const prefix = kind === 'sizal' ? 'SIZAL RX' : 'GL RX';
  return `${prefix}${String(rows[0].current_value).padStart(2, '0')}`;
}

// Pricing rules are stored as rule definitions only (name/category/condition).
// Prices are intentionally disabled for this version, so orders always save price = 0.
export async function priceFor() {
  return 0;
}

export function orderPayload(body) {
  return { right: JSON.stringify(prescription(body?.right_eye)), left: JSON.stringify(prescription(body?.left_eye)) };
}

export { db, failure, json };
