import * as XLSX from 'xlsx';
import { db, ensureSchema, json, failure } from '@/lib/db';
import { normalizeRetailerMobile } from '@/lib/retailers';

export const runtime = 'nodejs';

const normalizeHeader = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pick = (row, names) => {
  const wanted = new Set(names.map(normalizeHeader));
  const key = Object.keys(row).find((k) => wanted.has(normalizeHeader(k)));
  return key ? row[key] : '';
};

export async function POST(request) {
  try {
    await ensureSchema();
    const form = await request.formData();
    const file = form.get('file');
    if (!file) return failure('Select an Excel file');

    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
    const sql = db();
    let imported = 0;
    let skipped = 0;

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
      for (const row of rows) {
        const name = String(pick(row, ['Name', 'Customer Name', 'Retailer Name', 'Account Name'])).trim();
        const mobile = normalizeRetailerMobile(pick(row, ['Mobile', 'Mobile No', 'Mobile Number', 'Phone', 'Phone No', 'Contact', 'Contact Number']));
        if (!name) { skipped++; continue; }

        const masterKey = `${name.toLowerCase()}|${mobile}`;
        await sql`
          INSERT INTO retailer_master(name, mobile, master_key)
          VALUES(${name}, ${mobile}, ${masterKey})
          ON CONFLICT(master_key)
          DO UPDATE SET name=EXCLUDED.name, mobile=EXCLUDED.mobile, updated_at=NOW()
        `;
        imported++;
      }
    }

    return json({ imported, skipped });
  } catch (error) {
    console.error('Retailer import failed:', error);
    return failure(error.message || 'Import failed', 500);
  }
}
