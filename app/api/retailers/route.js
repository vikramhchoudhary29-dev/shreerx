import { db, ensureSchema, json, failure } from '@/lib/db';
import { normalizeRetailerMobile, seedRetailerMaster } from '@/lib/retailers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const clean = (v) => String(v ?? '').trim();

export async function GET(request) {
  try {
    await ensureSchema();
    const seeded = await seedRetailerMaster();
    const sql = db();
    const search = clean(new URL(request.url).searchParams.get('search'));

    if (!search) {
      const rows = await sql`
        SELECT id, name, mobile
        FROM retailer_master
        ORDER BY name ASC
        LIMIT 500
      `;
      return json(rows, { headers: { 'Cache-Control': 'no-store' } });
    }

    const digits = normalizeRetailerMobile(search);
    const rows = digits && /^\d+$/.test(search.replace(/\D/g, ''))
      ? await sql`
          SELECT id, name, mobile
          FROM retailer_master
          WHERE name ILIKE ${`%${search}%`}
             OR mobile ILIKE ${`%${digits}%`}
          ORDER BY name ASC
          LIMIT 100
        `
      : await sql`
          SELECT id, name, mobile
          FROM retailer_master
          WHERE name ILIKE ${`%${search}%`}
          ORDER BY name ASC
          LIMIT 100
        `;

    return json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Retailer lookup failed:', error);
    return failure(error.message || 'Retailer lookup failed', 500);
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const name = clean(body?.name);
    const mobile = normalizeRetailerMobile(body?.mobile);
    if (!name) return failure('Customer name is required');

    const sql = db();
    const masterKey = `${name.toLowerCase()}|${mobile}`;
    const rows = await sql`
      INSERT INTO retailer_master(name, mobile, master_key)
      VALUES(${name}, ${mobile}, ${masterKey})
      ON CONFLICT(master_key)
      DO UPDATE SET name=EXCLUDED.name, mobile=EXCLUDED.mobile, updated_at=NOW()
      RETURNING id, name, mobile
    `;
    return json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Retailer save failed:', error);
    return failure(error.message || 'Customer save failed', 500);
  }
}
