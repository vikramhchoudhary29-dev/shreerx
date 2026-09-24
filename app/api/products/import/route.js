import { ensureSchema } from '@/lib/db';
import { failureFor, json } from '@/lib/api';
import { importedRows, upsertProducts } from '@/lib/importers';
export const runtime = 'nodejs';
export async function POST(request) { try { await ensureSchema(); return json(await upsertProducts(await importedRows(request, 'products'))); } catch (error) { return failureFor(error, 'Product import failed'); } }
