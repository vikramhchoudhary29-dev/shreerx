import { ensureSchema } from '@/lib/db';
import { clean, db, failure, failureFor, json } from '@/lib/api';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const name = clean(body.rule_name);
    if (!name) return failure('Rule name is required.');
    const rows = await db()`
      UPDATE pricing_rules
      SET rule_name=${name}, category=${clean(body.category)}, condition=${clean(body.condition)}, updated_at=NOW()
      WHERE id=${id}
      RETURNING id, rule_name, category, condition, created_at, updated_at`;
    return rows[0] ? json(rows[0]) : failure('Rule not found.', 404);
  } catch (error) {
    return failureFor(error);
  }
}
