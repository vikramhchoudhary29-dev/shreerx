import { db, ensureSchema, json, failure } from '@/lib/db';
import { normalizeRetailerMobile } from '@/lib/retailers';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const rows = await db()`SELECT id, name, mobile FROM retailer_master WHERE id=${id}`;
    return rows.length ? json(rows[0]) : failure('Customer not found', 404);
  } catch (error) { return failure(error.message || 'Customer lookup failed', 500); }
}

export async function PATCH(request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const mobile = normalizeRetailerMobile(body?.mobile);
    if (!name) return failure('Customer name is required');

    const sql = db();
    const masterKey = `${name.toLowerCase()}|${mobile}`;
    const rows = await sql`
      UPDATE retailer_master
      SET name=${name}, mobile=${mobile}, master_key=${masterKey}, updated_at=NOW()
      WHERE id=${id}
      RETURNING id, name, mobile
    `;
    return rows.length ? json(rows[0]) : failure('Customer not found', 404);
  } catch (error) { return failure(error.message || 'Customer update failed', 500); }
}

export async function DELETE(request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const rows = await db()`DELETE FROM retailer_master WHERE id=${id} RETURNING id`;
    return rows.length ? json({ deleted: true }) : failure('Customer not found', 404);
  } catch (error) { return failure(error.message || 'Customer delete failed', 500); }
}
