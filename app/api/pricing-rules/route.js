import { ensureSchema } from '@/lib/db';
import { clean, db, failure, failureFor, json, noStore } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await ensureSchema();
    const rows = await db()`SELECT id, rule_name, category, condition, created_at, updated_at FROM pricing_rules ORDER BY rule_name`;
    return json(rows, noStore);
  } catch (error) {
    return failureFor(error);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const name = clean(body.rule_name);
    if (!name) return failure('Rule name is required.');
    const rows = await db()`
      INSERT INTO pricing_rules(rule_name, category, condition)
      VALUES(${name}, ${clean(body.category)}, ${clean(body.condition)})
      ON CONFLICT(rule_name) DO UPDATE SET
        category = EXCLUDED.category,
        condition = EXCLUDED.condition,
        updated_at = NOW()
      RETURNING id, rule_name, category, condition, created_at, updated_at`;
    return json(rows[0], { status: 201 });
  } catch (error) {
    return failureFor(error);
  }
}
