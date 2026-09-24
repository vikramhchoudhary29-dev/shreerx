import { ensureSchema, json, failure } from '@/lib/db';
import { seedProducts } from '@/lib/importers';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await ensureSchema();
    return json(await seedProducts());
  } catch (error) {
    console.error(error);
    return failure(error.message || 'Product seed failed', 500);
  }
}
