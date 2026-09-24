import { ensureSchema, json, failure } from '@/lib/db';
import { seedRetailerMaster } from '@/lib/retailers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run() {
  await ensureSchema();
  return seedRetailerMaster();
}

export async function GET() {
  try { return json(await run()); }
  catch (error) {
    console.error('Retailer master seed failed:', error);
    return failure(error.message || 'Seed failed', 500);
  }
}

export async function POST() {
  try { return json(await run()); }
  catch (error) {
    console.error('Retailer master seed failed:', error);
    return failure(error.message || 'Seed failed', 500);
  }
}
