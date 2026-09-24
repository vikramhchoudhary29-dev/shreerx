import { ensureSchema } from '@/lib/db'; import { failureFor, json } from '@/lib/api'; import { seedPricingRules } from '@/lib/importers';
export const runtime = 'nodejs'; export async function POST() { try { await ensureSchema(); return json(await seedPricingRules()); } catch (error) { return failureFor(error, 'Pricing-rule seed failed'); } }
