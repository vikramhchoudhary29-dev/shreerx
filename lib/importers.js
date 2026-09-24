import * as XLSX from 'xlsx';
import products from '@/data/products.json';
import pricingRules from '@/data/pricing-rules.json';
import { clean, db } from '@/lib/api';

const header = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const valueFor = (row, names) => {
  const wanted = new Set(names.map(header));
  const key = Object.keys(row).find((column) => wanted.has(header(column)));
  return key ? row[key] : '';
};

export async function upsertProducts(records) {
  const sql = db(); let imported = 0; let skipped = 0;
  for (const item of records) {
    const itCode = clean(item.it_code); const lensType = clean(item.lens_type);
    if (!itCode || !lensType) { skipped += 1; continue; }
    await sql`INSERT INTO products(it_code,lens_type,lens_index,dia,power_range,base_price,coatings,extra_data)
      VALUES(${itCode},${lensType},${clean(item.lens_index)},${clean(item.dia)},${clean(item.power_range)},0,${JSON.stringify((item.coatings || []).map((item) => typeof item === 'string' ? { name: clean(item) } : { name: clean(item.name) }))},${JSON.stringify({ product_category: clean(item.product_category) })})
      ON CONFLICT(it_code) DO UPDATE SET lens_type=EXCLUDED.lens_type,lens_index=EXCLUDED.lens_index,dia=EXCLUDED.dia,power_range=EXCLUDED.power_range,base_price=0,coatings=EXCLUDED.coatings,extra_data=EXCLUDED.extra_data,updated_at=NOW()`;
    imported += 1;
  }
  return { imported, skipped, total: records.length };
}

export async function upsertPricingRules(records) {
  const sql = db(); let imported = 0; let skipped = 0;
  for (const item of records) {
    const ruleName = clean(item.rule_name);
    if (!ruleName) { skipped += 1; continue; }
    await sql`INSERT INTO pricing_rules(rule_name,category,condition)
      VALUES(${ruleName},${clean(item.category)},${clean(item.condition)})
      ON CONFLICT(rule_name) DO UPDATE SET category=EXCLUDED.category,condition=EXCLUDED.condition,updated_at=NOW()`;
    imported += 1;
  }
  return { imported, skipped, total: records.length };
}

export const seedProducts = () => upsertProducts(products);
export const seedPricingRules = () => upsertPricingRules(pricingRules);

export async function importedRows(request, kind) {
  const form = await request.formData(); const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Select an Excel file.');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  if (!rows.length) throw new Error('No data rows found.');
  if (kind === 'products') return rows.map((row) => ({
    product_category: valueFor(row, ['Product Category']), it_code: valueFor(row, ['IT Code']), lens_type: valueFor(row, ['Lens Type']),
    lens_index: valueFor(row, ['Index', 'Lens Index']), power_range: valueFor(row, ['Power Range']),
    coatings: Object.entries(row).filter(([name, value]) => !['productcategory','itcode','lenstype','index','lensindex','powerrange','dia','diameter'].includes(header(name)) && value !== '').map(([name]) => ({ name: clean(name) })),
  }));
  return rows.map((row) => ({ rule_name: valueFor(row, ['Rule Name']), category: valueFor(row, ['Category']), condition: valueFor(row, ['Condition']) }));
}
