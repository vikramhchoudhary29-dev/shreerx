import { neon } from '@neondatabase/serverless';

let ready;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  return neon(process.env.DATABASE_URL);
}

export async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const sql = db();
      const statements = [
        `CREATE TABLE IF NOT EXISTS products (id BIGSERIAL PRIMARY KEY, it_code TEXT UNIQUE NOT NULL, lens_type TEXT NOT NULL, lens_index TEXT, dia TEXT, power_range TEXT, base_price NUMERIC(12,2) DEFAULT 0, coatings JSONB DEFAULT '[]'::jsonb, extra_data JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
        `CREATE TABLE IF NOT EXISTS pricing_rules (id BIGSERIAL PRIMARY KEY, rule_name TEXT UNIQUE NOT NULL, category TEXT, condition TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
        `CREATE TABLE IF NOT EXISTS order_counters (kind TEXT PRIMARY KEY, current_value INTEGER NOT NULL DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS sizal_orders (id BIGSERIAL PRIMARY KEY, order_number TEXT UNIQUE NOT NULL, order_date DATE NOT NULL DEFAULT CURRENT_DATE, customer_name TEXT NOT NULL, optical_name TEXT NOT NULL, ref_name TEXT, ref_mobile TEXT, it_code TEXT NOT NULL, lens_type TEXT, lens_index TEXT, dia TEXT, power_range TEXT, right_eye JSONB DEFAULT '{}'::jsonb, left_eye JSONB DEFAULT '{}'::jsonb, coating TEXT, price NUMERIC(12,2) DEFAULT 0, status TEXT NOT NULL DEFAULT 'Pending', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
        `CREATE TABLE IF NOT EXISTS glass_rx_orders (id BIGSERIAL PRIMARY KEY, order_number TEXT UNIQUE NOT NULL, order_date DATE NOT NULL DEFAULT CURRENT_DATE, ref_name TEXT, ref_mobile TEXT, it_code TEXT, lens_type TEXT NOT NULL, dia TEXT, right_eye JSONB DEFAULT '{}'::jsonb, left_eye JSONB DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'Pending', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
        `CREATE TABLE IF NOT EXISTS retailer_master (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, mobile TEXT NOT NULL DEFAULT '', master_key TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
        `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`,
        `ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
        `ALTER TABLE sizal_orders ADD COLUMN IF NOT EXISTS order_number TEXT`,
        `ALTER TABLE sizal_orders ADD COLUMN IF NOT EXISTS order_no TEXT`,
        `ALTER TABLE sizal_orders ADD COLUMN IF NOT EXISTS ref_name TEXT`,
        `ALTER TABLE sizal_orders ADD COLUMN IF NOT EXISTS ref_mobile TEXT`,
        `ALTER TABLE sizal_orders ADD COLUMN IF NOT EXISTS retailer_id BIGINT`,
        `ALTER TABLE glass_rx_orders ADD COLUMN IF NOT EXISTS order_number TEXT`,
        `ALTER TABLE glass_rx_orders ADD COLUMN IF NOT EXISTS order_no TEXT`,
        `ALTER TABLE glass_rx_orders ADD COLUMN IF NOT EXISTS ref_name TEXT`,
        `ALTER TABLE glass_rx_orders ADD COLUMN IF NOT EXISTS ref_mobile TEXT`,
        `ALTER TABLE glass_rx_orders ADD COLUMN IF NOT EXISTS retailer_id BIGINT`,
        `INSERT INTO order_counters(kind,current_value) VALUES ('sizal',0),('glass',0) ON CONFLICT (kind) DO NOTHING`,
        `INSERT INTO settings(key,value) VALUES ('whatsapp_number','919876543210') ON CONFLICT (key) DO NOTHING`,
        `INSERT INTO settings(key,value) VALUES ('whatsapp_sizal_template','*ORDER DETAILS*\n\n*Order No:* {{order_number}}\n*Order Date:* {{order_date}}\n*Customer:* {{customer_name}}\n*Optical:* {{optical_name}}\n\n━━━━━━━━━━━━━━\n\n*LENS DETAILS*\n\n*IT Code:* {{it_code}}\n*Lens Type:* {{lens_type}}\n*Index:* {{lens_index}}\n*DIA:* {{dia}}\n\n*RIGHT EYE*\nSPH: {{right_sph}} | CYL: {{right_cyl}} | AXIS: {{right_axis}} | ADD: {{right_add}}\n\n*LEFT EYE*\nSPH: {{left_sph}} | CYL: {{left_cyl}} | AXIS: {{left_axis}} | ADD: {{left_add}}\n\n*Coating:* {{coating}}') ON CONFLICT (key) DO NOTHING`,
        `INSERT INTO settings(key,value) SELECT 'whatsapp_office_template', value FROM settings WHERE key='whatsapp_sizal_template' ON CONFLICT (key) DO NOTHING`,
        `INSERT INTO settings(key,value) VALUES ('whatsapp_sizal_customer_template','*SHREE OPTICAL* 👓\n\nHello {{ref_name}} 👋\n\nYour *SIZAL RX Order* has been successfully placed. ✅\n\n*ORDER DETAILS*\nOrder No: *{{order_number}}*\nOrder Date: *{{order_date}}*\n\nCustomer: *{{customer_name}}*\nOptical: *{{optical_name}}*\n\n*LENS DETAILS* 🔍\nLens Type: *{{lens_type}}*\nIndex: *{{lens_index}}*\nDIA: *{{dia}}*\nCoating: *{{coating}}*\n\n*PRESCRIPTION* 📋\n\n*RIGHT EYE (OD)*\nSPH: {{right_sph}}\nCYL: {{right_cyl}}\nAXIS: {{right_axis}}\nADD: {{right_add}}\n\n*LEFT EYE (OS)*\nSPH: {{left_sph}}\nCYL: {{left_cyl}}\nAXIS: {{left_axis}}\nADD: {{left_add}}\n\nYour order has been received and will now be processed by our team. We will keep you updated regarding the order status.\n\nThank you for choosing *Shree Optical*. 🙏') ON CONFLICT (key) DO NOTHING`,
        `INSERT INTO settings(key,value) VALUES ('whatsapp_glass_customer_template','*SHREE OPTICAL* 👓\n\nHello {{ref_name}} 👋\n\nYour *Glass RX Order* has been successfully placed. ✅\n\n*ORDER DETAILS*\nOrder No: *{{order_number}}*\nOrder Date: *{{order_date}}*\n\n*LENS DETAILS* 🔍\nLens Type: *{{lens_type}}*\nDIA: *{{dia}}*\n\n*PRESCRIPTION* 📋\n\n*RIGHT EYE (OD)*\nSPH: {{right_sph}}\nCYL: {{right_cyl}}\nAXIS: {{right_axis}}\nADD: {{right_add}}\n\n*LEFT EYE (OS)*\nSPH: {{left_sph}}\nCYL: {{left_cyl}}\nAXIS: {{left_axis}}\nADD: {{left_add}}\n\nYour order has been received and will now be processed by our team. We will keep you updated regarding the order status.\n\nThank you for choosing *Shree Optical*. 🙏') ON CONFLICT (key) DO NOTHING`,
      ];
      for (const statement of statements) await sql.query(statement);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export const json = (data, init = {}) => Response.json({ success: true, data }, init);
export const failure = (message, status = 400) => Response.json({ success: false, message }, { status });
