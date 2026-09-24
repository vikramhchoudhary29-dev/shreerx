import { db } from '@/lib/db';
import retailerMaster from '@/data/customers.json';

export function normalizeRetailerMobile(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'nan') return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length >= 12 && digits.startsWith('91')) return digits.slice(-10);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function getRetailerMaster() {
  const unique = new Map();
  for (const row of retailerMaster) {
    const name = String(row?.name ?? '').trim();
    const mobile = normalizeRetailerMobile(row?.mobile);
    if (!name) continue;
    const masterKey = `${name.toLowerCase()}|${mobile}`;
    unique.set(masterKey, { name, mobile, master_key: masterKey });
  }
  return [...unique.values()];
}

export async function retailerForOrder(id) {
  const retailerId = Number(id);
  if (!Number.isSafeInteger(retailerId) || retailerId < 1) return null;
  const rows = await db()`SELECT id, name, mobile FROM retailer_master WHERE id=${retailerId}`;
  return rows[0] || null;
}

export async function seedRetailerMaster() {
  const sql = db();
  const master = getRetailerMaster();

  await sql.query(
    `INSERT INTO retailer_master(name, mobile, master_key)
     SELECT name, mobile, master_key
     FROM jsonb_to_recordset($1::jsonb)
       AS x(name TEXT, mobile TEXT, master_key TEXT)
     ON CONFLICT(master_key)
     DO UPDATE SET
       name = EXCLUDED.name,
       mobile = EXCLUDED.mobile,
       updated_at = NOW()`,
    [JSON.stringify(master)]
  );

  const totals = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE mobile <> '')::int AS with_mobile
    FROM retailer_master
  `;

  return {
    imported: master.length,
    sourceCount: master.length,
    totalInDatabase: Number(totals[0]?.total || 0),
    withMobile: Number(totals[0]?.with_mobile || 0),
    withoutMobile: Number(totals[0]?.total || 0) - Number(totals[0]?.with_mobile || 0),
  };
}
