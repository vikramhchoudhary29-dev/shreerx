'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatDate,
  formatDateTime,
  glassProducts,
  kolkataDate,
  normalizeIndianMobile,
  prescription,
  statuses,
  templateFor,
} from '@/lib/orders';

const api = async (path, options = {}) => {
  const response = await fetch(`/api/${path}`, { cache: 'no-store', ...options });
  const payload = await response.json().catch(() => ({
    success: false,
    message: `Server returned ${response.status}`,
  }));
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload.data;
};

const today = () => kolkataDate();

const blankEye = { sph: '', cyl: '', axis: '', add: '' };

function Field({ label, value, set, type = 'text', required = false, placeholder = '' }) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        required={required}
      />
    </label>
  );
}

function Badge({ value }) {
  return <span className={`badge ${String(value).toLowerCase()}`}>{value}</span>;
}

function Stat({ title, data }) {
  const counts = Object.fromEntries((data || []).map((row) => [row.status, row.count]));
  const total = (data || []).reduce((sum, row) => sum + Number(row.count || 0), 0);
  return (
    <article className="stat">
      <div className="stat-top"><p>{title}</p><span>LIVE</span></div>
      <strong>{total}</strong>
      <div className="stat-status">
        <span>Pending <b>{counts.Pending || 0}</b></span>
        <span>Dispatched <b>{counts.Dispatched || 0}</b></span>
        <span>Received <b>{counts.Received || 0}</b></span>
      </div>
    </article>
  );
}

export default function App() {
  const [page, setPage] = useState('Dashboard');
  const [dash, setDash] = useState({ sizal: [], glass: [], recent: [] });
  const [orders, setOrders] = useState({ sizal: [], glass: [] });
  const [settings, setSettings] = useState({});
  const [products, setProducts] = useState([]);
  const [rules, setRules] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState(null);
  const [view, setView] = useState(null);

  const load = async () => {
    try {
      const [d, s, g, st, p, r, c] = await Promise.all([
        api('dashboard'),
        api('sizal-orders'),
        api('glass-rx-orders'),
        api('settings'),
        api('products'),
        api('pricing-rules'),
        api('retailers'),
      ]);
      setDash(d);
      setOrders({ sizal: s, glass: g });
      setSettings(st);
      setProducts(p);
      setRules(r);
      setCustomers(c);
    } catch (error) {
      setNotice(error.message);
    }
  };

  useEffect(() => { load(); }, []);

  const go = (nextPage) => {
    setPage(nextPage);
    if (typeof window !== 'undefined' && window.innerWidth < 801) {
      document.querySelector('nav')?.classList.remove('open');
    }
  };

  const save = async (fn, success, after) => {
    setBusy(true);
    try {
      const data = await fn();
      setNotice(success);
      await load();
      after?.(data);
      return data;
    } catch (error) {
      setNotice(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createOrder = async (type, data) => {
    setBusy(true);
    try {
      const created = await api(type === 'sizal' ? 'sizal-orders' : 'glass-rx-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await load();
      setPopup({ type, order: created });
      return created;
    } catch (error) {
      setNotice(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const nav = [
    'Dashboard',
    'Create SIZAL RX Order',
    'Create Glass RX Order',
    'All Orders',
    'Products / Import Products',
    'Customers / Import Customers',
    'Pricing Rules',
    'Settings',
  ];

  return (
    <main>
      <header>
        <div className="brand">
          <img src="/shree-optical-logo.png" alt="Shree Optical" />
          <div>
            <h1>Shree Optical <span>RX Order Manager</span></h1>
            <small>By Vikram Choudhary · <a href="https://arvikdigital.in" target="_blank" rel="noreferrer">arvikdigital.in</a></small>
          </div>
        </div>
        <button className="mobile-nav" onClick={() => document.querySelector('nav')?.classList.toggle('open')} aria-label="Open navigation">☰</button>
      </header>

      <div className="shell">
        <nav>
          {nav.map((item, index) => (
            <button key={item} className={page === item ? 'active' : ''} onClick={() => go(item)}>
              <span className="nav-icon">{['⌂', '＋', '＋', '▤', '▦', '♙', '₹', '⚙'][index]}</span>
              {item}
            </button>
          ))}
        </nav>

        <section className="content">
          {notice && <div className="notice">{notice}<button onClick={() => setNotice('')} aria-label="Close notification">×</button></div>}
          {busy && <div className="saving">Saving…</div>}

          {page === 'Dashboard' && <Dashboard data={dash} go={go} />}
          {page === 'Create SIZAL RX Order' && <Sizal products={products} customers={customers} create={createOrder} />}
          {page === 'Create Glass RX Order' && <Glass customers={customers} create={createOrder} />}
          {page === 'All Orders' && (
            <Orders
              data={orders}
              settings={settings}
              update={(type, id, status) => save(
                () => api(`${type === 'sizal' ? 'sizal-orders' : 'glass-rx-orders'}/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status }),
                }),
                'Order status updated.'
              )}
              remove={(type, id) => {
                if (window.confirm('Delete this order? This cannot be undone.')) {
                  save(() => api(`${type === 'sizal' ? 'sizal-orders' : 'glass-rx-orders'}/${id}`, { method: 'DELETE' }), 'Order deleted.');
                }
              }}
              view={setView}
            />
          )}
          {page === 'Products / Import Products' && <ProductManager items={products} save={save} />}
          {page === 'Customers / Import Customers' && <CustomerManager items={customers} save={save} />}
          {page === 'Pricing Rules' && <RuleManager items={rules} save={save} />}
          {page === 'Settings' && <Settings initial={settings} save={save} />}
        </section>
      </div>

      {popup && <SharePopup data={popup} settings={settings} close={() => setPopup(null)} />}
      {view && <OrderModal type={view.type} order={view.order} close={() => setView(null)} settings={settings} />}
    </main>
  );
}

function Dashboard({ data, go }) {
  return (
    <>
      <div className="title hero-title">
        <div>
          <div className="eyebrow">SHREE OPTICAL · CONTROL CENTER</div>
          <h2>Good business starts with clean orders.</h2>
          <p>Track SIZAL and Glass RX workflow from one shared Neon database.</p>
        </div>
        <div className="quick-actions">
          <button onClick={() => go('Create SIZAL RX Order')}>+ SIZAL RX</button>
          <button onClick={() => go('Create Glass RX Order')}>+ Glass RX</button>
        </div>
      </div>

      <div className="stats">
        <Stat title="SIZAL / Lens RX Orders" data={data.sizal} />
        <Stat title="Glass RX Orders" data={data.glass} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h3>Recent orders</h3><p>Latest activity across both order systems.</p></div>
          <button className="text-btn" onClick={() => go('All Orders')}>View all →</button>
        </div>
        {data.recent?.length ? (
          <table>
            <thead><tr><th>Order</th><th>Date</th><th>Ref. Name</th><th>Lens Type</th><th>Status</th></tr></thead>
            <tbody>
              {data.recent.map((order) => (
                <tr key={`${order.type}-${order.order_number}`}>
                  <td><b>{order.order_number}</b><small>{order.type === 'sizal' ? 'SIZAL / Lens' : 'Glass RX'}</small></td>
                  <td>{formatDate(order.order_date)}</td>
                  <td>{order.ref_name || '-'}</td>
                  <td>{order.lens_type || '-'}</td>
                  <td><Badge value={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty text="No orders yet. Create your first RX order." />}
      </div>
    </>
  );
}

function CustomerPicker({ customers, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const selected = customers.find((customer) => String(customer.id) === String(value?.id)) ||
    remote.find((customer) => String(customer.id) === String(value?.id));

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setRemote([]);
      setSearchError('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const result = await api(`retailers?search=${encodeURIComponent(q)}`);
        if (!cancelled) setRemote(Array.isArray(result) ? result : []);
      } catch (error) {
        if (!cancelled) {
          setRemote([]);
          setSearchError(error.message || 'Unable to search customers');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q ? remote : customers;
    return source
      .filter((customer) => !q || `${customer.name || ''} ${customer.mobile || ''}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [customers, remote, query]);

  return (
    <label className="picker">
      Ref. Name
      <div className="picker-wrap">
        <input
          required
          value={selected?.name || query}
          placeholder="Search retailer / customer…"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 220)}
        />
        {open && (
          <div className="picker-menu">
            {searching ? <div className="picker-empty">Searching customers…</div> : searchError ? <div className="picker-empty">{searchError}</div> : list.length ? list.map((customer) => (
              <button
                type="button"
                key={customer.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(customer);
                  setQuery('');
                  setRemote([]);
                  setOpen(false);
                }}
              >
                <b>{customer.name}</b>
                <span>{customer.mobile || 'No mobile'}</span>
              </button>
            )) : <div className="picker-empty">No customer found</div>}
          </div>
        )}
      </div>
      {selected && <small>WhatsApp: {selected.mobile || 'No mobile number'}</small>}
    </label>
  );
}

function EyeFields({ value, onChange }) {
  return (
    <div className="eye-grid">
      {['sph', 'cyl', 'axis', 'add'].map((key) => (
        <label key={key}>
          {key.toUpperCase()}
          <input
            inputMode={key === 'axis' ? 'numeric' : 'decimal'}
            value={value?.[key] || ''}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

function Eyes({ form, setForm }) {
  return (
    <div className="eyes">
      <div className="eye-card">
        <div className="eye-title"><span>R</span><h3>Right Eye</h3></div>
        <EyeFields value={form.right_eye} onChange={(right_eye) => setForm({ ...form, right_eye })} />
      </div>
      <div className="eye-card">
        <div className="eye-title"><span>L</span><h3>Left Eye</h3></div>
        <EyeFields value={form.left_eye} onChange={(left_eye) => setForm({ ...form, left_eye })} />
      </div>
    </div>
  );
}

function Sizal({ products, customers, create }) {
  const [form, setForm] = useState({
    order_date: today(), customer_name: '', optical_name: '', ref_id: '', ref_name: '', ref_mobile: '',
    it_code: '', coating: '', dia: '', right_eye: { ...blankEye }, left_eye: { ...blankEye },
  });

  const product = products.find((item) => String(item.it_code).toLowerCase() === form.it_code.trim().toLowerCase());
  const coatings = product?.coatings || [];


  const submit = (event) => {
    event.preventDefault();
    if (!product) return;
    create('sizal', { ...form, right_eye: prescription(form.right_eye), left_eye: prescription(form.left_eye) });
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="title"><div className="eyebrow">NEW ORDER</div><h2>Create SIZAL RX Order</h2><p>Select the retailer in Ref. Name to enable customer sharing after creation.</p></div>

      <div className="form-grid four">
        <Field label="Order Date" type="date" value={form.order_date} set={(v) => setForm({ ...form, order_date: v })} required />
        <CustomerPicker customers={customers} value={form.ref_id ? { id: form.ref_id } : null} onChange={(customer) => setForm({ ...form, ref_id: customer?.id || '', ref_name: customer?.name || '', ref_mobile: customer?.mobile || '' })} />
        <Field label="Customer Name" value={form.customer_name} set={(v) => setForm({ ...form, customer_name: v })} required />
        <Field label="Optical Name" value={form.optical_name} set={(v) => setForm({ ...form, optical_name: v })} required />
      </div>

      <div className="form-grid four">
        <Field label="IT Code" value={form.it_code} set={(v) => setForm({ ...form, it_code: v })} required placeholder="e.g. SRED01" />
        <Field label="DIA" value={form.dia} set={(v) => setForm({ ...form, dia: v })} placeholder="Enter DIA if required" />
        <div className="info-field"><span>Lens Type</span><b>{product?.lens_type || '—'}</b></div>
        <div className="info-field"><span>Index / Power Range</span><b>{product ? `${product.lens_index || '-'} · ${product.power_range || '-'}` : '—'}</b></div>
      </div>

      {form.it_code && (
        <div className={product ? 'product-found' : 'product-missing'}>
          {product ? <><b>Product found</b><span>{product.it_code} · {product.lens_type} · Index {product.lens_index || '-'} · Power {product.power_range || '-'}</span></> : 'IT Code not found. Import the product file before creating this order.'}
        </div>
      )}

      {product && (
        <>
          <div className="form-grid one">
            <label>
              Coating
              <select required value={form.coating} onChange={(event) => setForm({ ...form, coating: event.target.value })}>
                <option value="">Select coating</option>
                {coatings.map((item) => {
                  const coating = typeof item === 'string' ? { name: item } : item;
                  return <option key={coating.name} value={coating.name}>{coating.name}</option>;
                })}
              </select>
            </label>
          </div>
          <Eyes form={form} setForm={setForm} />
          <button className="primary large">Create SIZAL Order</button>
        </>
      )}
    </form>
  );
}

function Glass({ customers, create }) {
  const [form, setForm] = useState({ order_date: today(), lens_type: glassProducts[0], dia: '', right_eye: { ...blankEye }, left_eye: { ...blankEye }, ref_id: '', ref_name: '', ref_mobile: '', it_code: '' });

  const submit = (event) => {
    event.preventDefault();
    create('glass', { ...form, right_eye: prescription(form.right_eye), left_eye: prescription(form.left_eye) });
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="title"><div className="eyebrow">NEW ORDER</div><h2>Create Glass RX Order</h2><p>Choose the retailer in Ref. Name. Customer and optical names are intentionally not collected.</p></div>
      <div className="form-grid three">
        <Field label="Order Date" type="date" value={form.order_date} set={(v) => setForm({ ...form, order_date: v })} required />
        <CustomerPicker customers={customers} value={form.ref_id ? { id: form.ref_id } : null} onChange={(customer) => setForm({ ...form, ref_id: customer?.id || '', ref_name: customer?.name || '', ref_mobile: customer?.mobile || '' })} />
        <label>Lens Type<select value={form.lens_type} onChange={(event) => setForm({ ...form, lens_type: event.target.value, it_code: event.target.value.replace(' KT', '') })}>{glassProducts.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="form-grid one"><Field label="DIA" value={form.dia} set={(v) => setForm({ ...form, dia: v })} /></div>
      <Eyes form={form} setForm={setForm} />
      <button className="primary large">Create Glass RX Order</button>
    </form>
  );
}

function Orders({ data, settings, update, remove, view }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const matches = (order) => {
    const needle = search.trim().toLowerCase();
    return (!needle || JSON.stringify(order).toLowerCase().includes(needle)) && (filter === 'All' || order.status === filter);
  };

  const List = ({ items, type }) => {
    const filtered = items.filter(matches);
    return (
      <div className="panel orders">
        <div className="panel-head"><div><h3>{type === 'sizal' ? 'SIZAL / Lens RX Orders' : 'Glass RX Orders'}</h3><p>{filtered.length} matching orders</p></div></div>
        {filtered.length ? (
          <table>
            <thead><tr><th>Order</th><th>Order Date</th><th>Ref. Name</th><th>{type === 'sizal' ? 'Customer / Optical' : 'Lens Type'}</th><th>Updated</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td><b>{order.order_number}</b><small>{type === 'sizal' ? 'SIZAL' : 'Glass RX'}</small></td>
                  <td>{formatDate(order.order_date)}</td>
                  <td><b>{order.ref_name || '-'}</b><small>{order.ref_mobile || 'No mobile'}</small></td>
                  <td>{type === 'sizal' ? <>{order.customer_name}<small>{order.optical_name}</small></> : order.lens_type}</td>
                  <td>{formatDateTime(order.updated_at)}</td>
                  <td><select className="status-select" value={order.status} onChange={(event) => update(type, order.id, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                  <td className="actions">
                    <button onClick={() => view({ type, order })}>View Order</button>
                    <button onClick={() => shareOrder(type, order, settings, false)}>Mumbai Office</button>
                    {type === 'sizal' ? (
                      <button onClick={() => generateSizalPdf(order)}>Generate PDF</button>
                    ) : (
                      <button onClick={() => printOrder(type, order)}>Print</button>
                    )}
                    <button className="danger" onClick={() => remove(type, order.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty text="No matching orders." />}
      </div>
    );
  };

  return (
    <>
      <div className="title split">
        <div><div className="eyebrow">ORDER HISTORY</div><h2>All Orders</h2><p>One history with separate SIZAL and Glass RX sections.</p></div>
        <div className="filters"><input placeholder="Search order, ref. name, customer, IT code…" value={search} onChange={(e) => setSearch(e.target.value)} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
      </div>
      <List items={data.sizal} type="sizal" />
      <List items={data.glass} type="glass" />
    </>
  );
}

function SharePopup({ data, settings, close }) {
  const { type, order } = data;
  const customerTemplate = settings[type === 'sizal' ? 'whatsapp_sizal_customer_template' : 'whatsapp_glass_customer_template'];
  const officeTemplate = settings.whatsapp_office_template || settings.whatsapp_sizal_template || '';
  const customerMessage = templateFor(type, order, customerTemplate);
  const officeMessage = templateFor(type, order, officeTemplate);
  const customerNumber = normalizeIndianMobile(order.ref_mobile);
  const officeNumber = normalizeIndianMobile(settings.whatsapp_number);

  return (
    <div className="modal-backdrop">
      <div className="share-card">
        <div className="success-icon">✓</div>
        <h2>{order.order_number} created</h2>
        <p>{order.ref_name ? `Ref. Name: ${order.ref_name}` : 'Order saved successfully.'}</p>
        <div className="share-buttons">
          <button className="share-customer" disabled={!customerNumber} onClick={() => openWhatsApp(customerNumber, customerMessage)}>
            Share to Customer
            <small>{customerNumber ? order.ref_name : 'No mobile number for this retailer'}</small>
          </button>
          <button disabled={!officeNumber} onClick={() => openWhatsApp(officeNumber, officeMessage)}>
            Mumbai Office
            <small>{settings.whatsapp_number || 'Set the office number in Settings'}</small>
          </button>
          {type === 'sizal' && (
            <button onClick={() => generateSizalPdf(order)}>Generate SIZAL PDF<small>Download {order.order_number}.pdf</small></button>
          )}
          <button className="close-btn" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}

function OrderModal({ type, order, close, settings }) {
  const right = order.right_eye || {};
  const left = order.left_eye || {};
  return (
    <div className="modal-backdrop">
      <div className="view-card">
        <div className="modal-head"><div><div className="eyebrow">ORDER DETAILS</div><h2>{order.order_number}</h2></div><button onClick={close}>×</button></div>
        <div className="detail-grid">
          <Detail label="Order Date" value={formatDate(order.order_date)} />
          <Detail label="Ref. Name" value={order.ref_name ? `${order.ref_name}${order.ref_mobile ? ` · ${order.ref_mobile}` : ''}` : '-'} />
          {type === 'sizal' && <><Detail label="Customer" value={order.customer_name} /><Detail label="Optical" value={order.optical_name} /><Detail label="IT Code" value={order.it_code} /><Detail label="Index" value={order.lens_index} /><Detail label="Power Range" value={order.power_range} /><Detail label="Coating" value={order.coating} /></>}
          <Detail label="Lens Type" value={order.lens_type} />
          <Detail label="DIA" value={order.dia || '-'} />
          <Detail label="Status" value={order.status} />
          <Detail label="Last Updated" value={formatDateTime(order.updated_at)} />
          <Detail label="Created" value={formatDateTime(order.created_at)} />
        </div>
        <div className="prescription-view"><EyeRead title="Right Eye" data={right} /><EyeRead title="Left Eye" data={left} /></div>
        <div className="modal-actions">
          <button className="primary" onClick={() => shareOrder(type, order, settings, false)}>Share to Mumbai Office</button>
          {type === 'sizal' ? (
            <button onClick={() => generateSizalPdf(order)}>Generate SIZAL PDF</button>
          ) : (
            <button onClick={() => printOrder(type, order)}>Print A5</button>
          )}
          <button onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return <div><span>{label}</span><b>{value || '-'}</b></div>;
}

function EyeRead({ title, data }) {
  return <div><h3>{title}</h3><p><b>SPH</b> {data.sph || '-'} <b>CYL</b> {data.cyl || '-'} <b>AXIS</b> {data.axis || '-'} <b>ADD</b> {data.add || '-'}</p></div>;
}

function ProductManager({ items, save }) {
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const filtered = items.filter((item) => `${item.it_code} ${item.lens_type} ${item.power_range}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="title"><div className="eyebrow">CATALOG</div><h2>Products / Import Products</h2><p>Import your supplied product workbook. Coating names are stored; price values are ignored.</p></div>
      <div className="import-grid">
        <form className="upload panel" onSubmit={(event) => { event.preventDefault(); if (!file) return; save(async () => { const form = new FormData(); form.append('file', file); return api('products/import', { method: 'POST', body: form }); }, 'Product import completed.'); }}>
          <h3>Import Excel</h3><p>Supports .xlsx and .xls product workbooks.</p><input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files[0])} /><button className="primary">Import selected Excel</button>
        </form>
        <div className="upload panel"><h3>Load supplied product file</h3><p>The latest supplied RX WEP product workbook is bundled with this version.</p><button className="primary" onClick={() => save(() => api('products/seed', { method: 'POST' }), 'Supplied product file loaded into Neon.')}>Load supplied file into Neon</button></div>
      </div>
      <div className="panel">
        <div className="panel-head"><div><h3>Products</h3><p>{items.length} products currently saved in the shared database.</p></div><input style={{ maxWidth: 320 }} placeholder="Search IT code or lens type…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {filtered.length ? <table><thead><tr><th>IT Code</th><th>Lens Type</th><th>Index</th><th>Power Range</th><th>Coatings</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><b>{item.it_code}</b></td><td>{item.lens_type}</td><td>{item.lens_index || '-'}</td><td>{item.power_range || '-'}</td><td>{(item.coatings || []).map((coating) => typeof coating === 'string' ? coating : coating.name).join(' · ') || '-'}</td><td><button onClick={() => setEditing(item)}>Edit</button></td></tr>)}</tbody></table> : <Empty text="No products found." />}
      </div>
      {editing && <ProductEdit product={editing} close={() => setEditing(null)} save={save} />}
    </>
  );
}

function ProductEdit({ product, close, save }) {
  const [form, setForm] = useState(product);
  return (
    <div className="modal-backdrop"><div className="view-card"><div className="modal-head"><div><div className="eyebrow">PRODUCT</div><h2>Edit {product.it_code}</h2></div><button onClick={close}>×</button></div>
      <div className="form-grid two"><Field label="Lens Type" value={form.lens_type} set={(v) => setForm({ ...form, lens_type: v })} /><Field label="Index" value={form.lens_index} set={(v) => setForm({ ...form, lens_index: v })} /><Field label="DIA" value={form.dia} set={(v) => setForm({ ...form, dia: v })} /><Field label="Power Range" value={form.power_range} set={(v) => setForm({ ...form, power_range: v })} /></div>
      <div className="modal-actions"><button className="primary" onClick={() => save(() => api(`products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }), 'Product updated.', close)}>Save changes</button><button onClick={close}>Cancel</button></div>
    </div></div>
  );
}

function CustomerManager({ items, save }) {
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  const filtered = items.filter((item) =>
    `${item.name || ''} ${item.mobile || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const loadSupplied = async () => {
    setLoadingSeed(true);
    setSeedMessage('');
    try {
      const result = await api('retailers/seed', { method: 'POST' });
      setSeedMessage(`${result.imported} supplied customers loaded. ${result.withMobile} have mobile numbers. ${result.totalInDatabase} total in Neon.`);
      await save(() => api('retailers'), 'Customer master loaded into Neon.');
    } catch (error) {
      setSeedMessage(error.message || 'Customer import failed.');
    } finally {
      setLoadingSeed(false);
    }
  };

  return (
    <>
      <div className="title">
        <div className="eyebrow">CUSTOMER MASTER</div>
        <h2>Customers / Import Customers</h2>
        <p>Manage the shared retailer / Ref. Name master. Only Name and Mobile are stored in Neon.</p>
      </div>

      <div className="import-grid">
        <form className="upload panel" onSubmit={(event) => {
          event.preventDefault();
          if (!file) return;
          save(async () => {
            const form = new FormData();
            form.append('file', file);
            return api('retailers/import', { method: 'POST', body: form });
          }, 'Customer import completed.');
        }}>
          <h3>Import Excel</h3>
          <p>Supports .xlsx and .xls. Only Name + Mobile are imported.</p>
          <input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files[0])} />
          <button className="primary" type="submit">Import selected Excel</button>
        </form>

        <div className="upload panel">
          <h3>Load supplied customer file</h3>
          <p>The supplied 100-row customer master is bundled with this version.</p>
          <button className="primary" onClick={loadSupplied} disabled={loadingSeed}>
            {loadingSeed ? 'Loading customers…' : 'Load supplied file into Neon'}
          </button>
          {seedMessage && <small>{seedMessage}</small>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Customers</h3>
            <p>{items.length} customers currently saved in the shared database.</p>
          </div>
          <input
            style={{ maxWidth: 320 }}
            placeholder="Search name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filtered.length ? (
          <table>
            <thead><tr><th>Name</th><th>Mobile</th><th>WhatsApp</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><b>{item.name}</b></td>
                  <td>{item.mobile || <span className="muted">No mobile</span>}</td>
                  <td>{item.mobile ? <Badge value="Available" /> : <Badge value="Missing" />}</td>
                  <td className="actions"><button onClick={() => setEditing(item)}>Edit</button><button className="danger" onClick={() => { if (window.confirm(`Delete ${item.name}? This cannot be undone.`)) save(() => api(`retailers/${item.id}`, { method: 'DELETE' }), 'Customer deleted.'); }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty text="No customers found." />}
      </div>

      {editing && <CustomerEdit customer={editing} close={() => setEditing(null)} save={save} />}
    </>
  );
}

function CustomerEdit({ customer, close, save }) {
  const [form, setForm] = useState({ name: customer.name || '', mobile: customer.mobile || '' });
  return (
    <div className="modal-backdrop">
      <div className="view-card">
        <div className="modal-head">
          <div><div className="eyebrow">CUSTOMER</div><h2>Edit Customer</h2></div>
          <button onClick={close}>×</button>
        </div>
        <div className="form-grid two">
          <Field label="Name" value={form.name} set={(v) => setForm({ ...form, name: v })} required />
          <Field label="Mobile" value={form.mobile} set={(v) => setForm({ ...form, mobile: v })} placeholder="10-digit mobile" />
        </div>
        <div className="modal-actions">
          <button className="primary" onClick={() => save(
            () => api(`retailers/${customer.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form),
            }),
            'Customer updated.',
            close
          )}>Save changes</button>
          <button onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function RuleManager({ items, save }) {
  const blank = { rule_name: '', category: '', condition: '' };
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const form = editing || blank;
  const set = (key, value) => setEditing({ ...form, [key]: value });

  return (
    <>
      <div className="title"><div className="eyebrow">PRICING ENGINE</div><h2>Pricing Rules</h2><p>Manage pricing and validation rules. Rules are stored without any price values.</p></div>
      <div className="import-grid"><form className="upload panel" onSubmit={(event) => { event.preventDefault(); if (!file) return; save(async () => { const form = new FormData(); form.append('file', file); return api('pricing-rules/import', { method: 'POST', body: form }); }, 'Pricing rules imported.'); }}><h3>Import pricing rules</h3><p>Imports Rule Name, Category, and Condition only. Price values are not used.</p><input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files[0])} /><button className="primary">Import selected Excel</button></form><div className="upload panel"><h3>Load supplied rules</h3><p>The supplied 12 pricing rules are bundled as deployment-safe data.</p><button className="primary" onClick={() => save(() => api('pricing-rules/seed', { method: 'POST' }), 'Supplied pricing rules loaded into Neon.')}>Load supplied rules into Neon</button></div></div>
      <div className="panel rule-form"><h3>{editing ? 'Edit rule' : 'Add rule'}</h3><div className="form-grid three"><Field label="Rule Name" value={form.rule_name} set={(v) => set('rule_name', v)} required /><Field label="Category" value={form.category} set={(v) => set('category', v)} /><Field label="Condition" value={form.condition} set={(v) => set('condition', v)} /></div><div className="row-actions"><button className="primary" onClick={() => save(() => api(editing?.id ? `pricing-rules/${editing.id}` : 'pricing-rules', { method: editing?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }), 'Pricing rule saved.', () => setEditing(null))}>{editing ? 'Save changes' : 'Add pricing rule'}</button>{editing && <button onClick={() => setEditing(null)}>Cancel</button>}</div></div>
      <div className="panel"><h3>Saved rules ({items.length})</h3>{items.length ? <table><thead><tr><th>Rule</th><th>Category</th><th>Condition</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><b>{item.rule_name}</b></td><td>{item.category}</td><td>{item.condition}</td><td><button onClick={() => setEditing(item)}>Edit</button></td></tr>)}</tbody></table> : <Empty text="No pricing rules imported yet." />}</div>
    </>
  );
}

function Settings({ initial, save }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const tokens = '{{order_number}}, {{order_date}}, {{ref_name}}, {{ref_mobile}}, {{customer_name}}, {{optical_name}}, {{it_code}}, {{lens_type}}, {{lens_index}}, {{dia}}, {{power_range}}, {{coating}}, {{right_sph}}, {{right_cyl}}, {{right_axis}}, {{right_add}}, {{left_sph}}, {{left_cyl}}, {{left_axis}}, {{left_add}}';

  const saveSettings = () => save(() => api('settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }), 'Settings saved successfully.');

  return (
    <>
      <div className="title"><div className="eyebrow">SYSTEM SETTINGS</div><h2>Settings</h2><p>WhatsApp numbers and message templates are shared through Neon and apply on every device.</p></div>
      <div className="panel settings">
        <div className="settings-section"><h3>WhatsApp numbers</h3><Field label="Mumbai office / Admin WhatsApp number" value={form.whatsapp_number || ''} set={(v) => setForm({ ...form, whatsapp_number: v })} placeholder="919876543210" /><small>Use a 10-digit Indian mobile number or include the country code.</small></div>
        <div className="settings-section"><h3>Mumbai Office WhatsApp template</h3><p className="hint">This is the old office template. It is used only for the Mumbai Office button for both SIZAL and Glass RX orders.</p><textarea value={form.whatsapp_office_template || form.whatsapp_sizal_template || ''} onChange={(e) => setForm({ ...form, whatsapp_office_template: e.target.value })} /></div>
        <div className="settings-section"><h3>SIZAL · Ref. Name WhatsApp template</h3><p className="hint">Separate message sent to the selected Ref. Name.</p><textarea value={form.whatsapp_sizal_customer_template || ''} onChange={(e) => setForm({ ...form, whatsapp_sizal_customer_template: e.target.value })} /></div>
        <div className="settings-section"><h3>Glass RX · Ref. Name WhatsApp template</h3><p className="hint">Separate message sent to the selected Ref. Name.</p><textarea value={form.whatsapp_glass_customer_template || ''} onChange={(e) => setForm({ ...form, whatsapp_glass_customer_template: e.target.value })} /></div>
        <div className="token-box"><b>Available placeholders</b><p>{tokens}</p></div>
        <button className="primary large" onClick={saveSettings}>Save Settings</button>
      </div>

    </>
  );
}

function Empty({ text }) { return <p className="empty">{text}</p>; }

function dedupeWhatsAppMessage(message) {
  const text = String(message || '');
  if (!text) return '';
  // Guard against the same rendered template being concatenated twice by an
  // older browser/runtime state. Only collapse an exact two-copy string;
  // legitimate messages containing repeated sections are left untouched.
  if (text.length % 2 === 0) {
    const half = text.length / 2;
    if (text.slice(0, half) === text.slice(half)) return text.slice(0, half);
  }
  return text;
}

let whatsappShareInProgress = false;

function openWhatsApp(number, message) {
  const normalized = normalizeIndianMobile(number);
  if (!normalized) {
    window.alert('No valid WhatsApp number is configured for this destination.');
    return;
  }

  // One click = one navigation. Do not use window.open() with a fallback here,
  // because some browsers can report the popup as blocked after navigation has
  // already started, which can cause the WhatsApp compose URL to be opened twice.
  if (whatsappShareInProgress) return;
  whatsappShareInProgress = true;

  const cleanMessage = dedupeWhatsAppMessage(message);
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(cleanMessage)}`;
  window.location.assign(url);

  // Allow another intentional share after the navigation attempt has settled.
  window.setTimeout(() => {
    whatsappShareInProgress = false;
  }, 2500);
}

function shareOrder(type, order, settings, customer) {
  const number = customer ? order.ref_mobile : settings.whatsapp_number;
  const templateKey = customer
    ? (type === 'sizal' ? 'whatsapp_sizal_customer_template' : 'whatsapp_glass_customer_template')
    : 'whatsapp_office_template';
  openWhatsApp(number, templateFor(type, order, settings[templateKey]));
}


function pdfEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function pdfSafeFilename(value) {
  const clean = String(value || 'SIZAL RX')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return `${clean || 'SIZAL RX'}.pdf`;
}

function generateSizalPdf(order) {
  if (!order) return;

  // Exact SIZAL RX reference layout:
  // A5 landscape page (210 × 148 mm).
  // Compact order card (165 × 96 mm), centered on the page.
  // All rows, including OPTI, stay inside the same outer border.
  const MM = 72 / 25.4;
  const W = 210 * MM;
  const H = 148 * MM;

  const cardW = 165 * MM;
  const cardH = 96 * MM;
  const left = (W - cardW) / 2;
  const bottom = (H - cardH) / 2;
  const right = left + cardW;
  const top = bottom + cardH;

  const pad = 4 * MM;
  const innerLeft = left + pad;
  const innerRight = right - pad;

  const rightEye = order.right_eye || {};
  const leftEye = order.left_eye || {};

  // Reference product row: IT Code + RX + lens type + index + coating.
  const lensLine = [
    order.it_code ? `${order.it_code}-RX` : 'RX',
    order.lens_type || '',
    order.lens_index || '',
    order.coating || '',
  ].filter(Boolean).join(' ');

  const commands = [];

  const text = (x, y, value, size = 10, bold = false) => {
    const font = bold ? 'F2' : 'F1';
    commands.push(
      `BT /${font} ${size.toFixed(2)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET`
    );
  };

  const line = (x1, y1, x2, y2, width = 1.2) => {
    commands.push(
      `${width.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  };

  const rect = (x, y, w, h, width = 1.2) => {
    commands.push(
      `${width.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`
    );
  };

  // ONE outer rectangle — exactly like the reference.
  rect(left, bottom, cardW, cardH, 1.6);

  /*
   * Vertical structure from the reference:
   *
   * Header       ≈ 12 mm
   * RX table     ≈ 37 mm
   * Lens row     ≈ 15 mm
   * Name row     ≈ 14 mm
   * Opti row     ≈ 18 mm
   *
   * Total        = 96 mm
   */
  const headerH = 12 * MM;
  const tableH = 37 * MM;
  const lensH = 15 * MM;
  const nameH = 14 * MM;
  const optiH = cardH - headerH - tableH - lensH - nameH;

  const headerBottom = top - headerH;
  const tableTop = headerBottom;
  const tableBottom = tableTop - tableH;
  const lensBottom = tableBottom - lensH;
  const nameBottom = lensBottom - nameH;

  // Header separator.
  line(left, headerBottom, right, headerBottom, 1.25);

  // Header text.
  const orderText = `Order No.-${order.order_number || '-'}`;
  const dateText = `Date :${formatDate(order.order_date)}`;

  text(innerLeft, top - 8.2 * MM, orderText, 11.2, true);

  // Right aligned date, matching the reference.
  const dateEstimatedWidth = dateText.length * 5.35;
  text(innerRight - dateEstimatedWidth, top - 8.2 * MM, dateText, 11.2, true);

  // Prescription table.
  const tableLeft = innerLeft;
  const tableRight = innerRight;
  const tableWidth = tableRight - tableLeft;

  // Column proportions based on the reference.
  const proportions = [0.145, 0.215, 0.215, 0.215, 0.210];
  const cols = [tableLeft];
  proportions.forEach((ratio) => {
    cols.push(cols[cols.length - 1] + tableWidth * ratio);
  });

  rect(tableLeft, tableBottom, tableWidth, tableH, 1.25);

  // Three horizontal rows: header + R + L.
  const rowH = tableH / 3;
  line(tableLeft, tableTop - rowH, tableRight, tableTop - rowH, 1.1);
  line(tableLeft, tableTop - rowH * 2, tableRight, tableTop - rowH * 2, 1.1);

  // Vertical grid.
  for (let i = 1; i < cols.length - 1; i += 1) {
    line(cols[i], tableBottom, cols[i], tableTop, 1.1);
  }

  const headers = ['EYE', 'SPH', 'CYL', 'AXIS', 'ADD'];

  headers.forEach((label, i) => {
    const center = (cols[i] + cols[i + 1]) / 2;
    const size = 10.0;
    const estimated = label.length * size * 0.52;
    text(center - estimated / 2, tableTop - rowH + 3.0 * MM, label, size, true);
  });

  const drawRow = (rowIndex, eye, values) => {
    const cells = [
      eye,
      values.sph || '0.00',
      values.cyl || '0.00',
      values.axis || '0',
      values.add || '0.00',
    ];

    const baseline = tableTop - rowH * (rowIndex + 1) + 3.0 * MM;

    cells.forEach((value, i) => {
      const center = (cols[i] + cols[i + 1]) / 2;
      const size = 10.0;
      const estimated = String(value).length * size * 0.52;
      text(center - estimated / 2, baseline, value, size, true);
    });
  };

  drawRow(1, 'R', rightEye);
  drawRow(2, 'L', leftEye);

  // Lens information row.
  // The reference has this as a full-width row inside the outer border.
  text(innerLeft, lensBottom + 5.1 * MM, lensLine || '-', 10.6, true);
  line(left, lensBottom, right, lensBottom, 1.2);

  // Customer/name row.
  text(innerLeft, nameBottom + 5.0 * MM, 'Name :', 10.8, true);

  const customer = order.customer_name || '';
  if (customer) {
    let nameSize = 10.4;
    if (customer.length > 32) nameSize = 9.4;
    text(innerLeft + 24 * MM, nameBottom + 5.0 * MM, customer, nameSize, false);
  }

  line(left, nameBottom, right, nameBottom, 1.2);

  // Optical row — IMPORTANT: stays INSIDE the same outer border.
  const optical = order.optical_name || order.ref_name || '-';
  text(innerLeft + 4 * MM, bottom + 5.8 * MM, `Opti : ${optical}`, 10.6, true);

  const content = commands.join('\n');
  const objects = [];

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`
  );
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = pdfSafeFilename(order.order_number);

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printOrder(type, order) {
  const right = order.right_eye || {};
  const left = order.left_eye || {};
  const rows = [
    ['Order No', order.order_number],
    ['Order Date', formatDate(order.order_date)],
    ['Ref. Name', order.ref_name || '-'],
    ...(type === 'sizal'
      ? [
          ['Customer', order.customer_name],
          ['Optical', order.optical_name],
          ['IT Code', order.it_code],
          ['Lens Type', order.lens_type],
          ['Index', order.lens_index || '-'],
          ['DIA', order.dia || '-'],
          ['Power Range', order.power_range || '-'],
          ['Coating', order.coating || '-'],
        ]
      : [
          ['Lens Type', order.lens_type],
          ['DIA', order.dia || '-'],
        ]),
    ['Status', order.status],
  ];
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const eye = (title, values) => `<div class="eye"><h3>${escapeHtml(title)}</h3><p><b>SPH</b> ${escapeHtml(values.sph || '-')} &nbsp; <b>CYL</b> ${escapeHtml(values.cyl || '-')} &nbsp; <b>AXIS</b> ${escapeHtml(values.axis || '-')} &nbsp; <b>ADD</b> ${escapeHtml(values.add || '-')}</p></div>`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<html><head><title>${escapeHtml(order.order_number)}</title><style>@page{size:A5;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;font-size:12px}.head{border-bottom:2px solid #172033;padding-bottom:8px;margin-bottom:14px}h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:15px 0 8px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px}.meta div{border-bottom:1px solid #ddd;padding:5px}.meta span{display:block;color:#777;font-size:9px;text-transform:uppercase}.meta b{font-size:11px}.eyes{display:grid;grid-template-columns:1fr 1fr;gap:12px}.eye{border:1px solid #ccc;padding:9px}.eye h3{margin:0 0 8px}.foot{margin-top:16px;color:#777;font-size:9px}</style></head><body><div class="head"><h1>Shree Optical RX Order Manager</h1><div>${escapeHtml(order.order_number)} · ${type === 'sizal' ? 'SIZAL / Lens RX' : 'Glass RX'}</div></div><div class="meta">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div><h2>Prescription</h2><div class="eyes">${eye('Right Eye', right)}${eye('Left Eye', left)}</div><div class="foot">Printed ${escapeHtml(formatDateTime(new Date().toISOString()))}</div></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
