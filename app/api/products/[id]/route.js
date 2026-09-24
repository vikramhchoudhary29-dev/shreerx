import { ensureSchema } from '@/lib/db';
import { clean, db, failure, failureFor, json } from '@/lib/api';
export const runtime = 'nodejs';
export async function PATCH(request, { params }) { try { await ensureSchema(); const { id } = await params; const body = await request.json(); if (!clean(body.lens_type)) return failure('Lens Type is required.'); const rows = await db()`UPDATE products SET lens_type=${clean(body.lens_type)},lens_index=${clean(body.lens_index)},dia=${clean(body.dia)},power_range=${clean(body.power_range)},base_price=${Number(body.base_price) || 0},coatings=${JSON.stringify(body.coatings || [])},updated_at=NOW() WHERE id=${id} RETURNING *`; return rows[0] ? json(rows[0]) : failure('Product not found.', 404); } catch (error) { return failureFor(error); } }
