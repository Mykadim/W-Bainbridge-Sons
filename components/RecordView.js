'use client';

import { useState } from 'react';
import { LOCATIONS, PRODUCTS, apply, keyOf, locationName, productName } from '@/lib/stock';

const REASONS = ['Stock count', 'Damaged', 'Used on farm', 'Weather loss', 'Other'];

export default function RecordView({ state, rows, act }) {
  return (
    <section className="grid-2">
      <Receive state={state} act={act} />
      <Adjust state={state} rows={rows} act={act} />
    </section>
  );
}

function Receive({ state, act }) {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [locationId, setLocationId] = useState(LOCATIONS[0].id);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const current = state.stock[keyOf(productId, locationId)];

  const submit = (e) => {
    e.preventDefault();
    const action = { type: 'receive', productId, locationId, qty, note };
    if (!apply(state, action).error) { setQty(''); setNote(''); }
    act(action);
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Record bales received</h2>
      <p className="muted">Bales brought in from the field or bought in. Works from a phone in the yard.</p>
      <div className="row-2">
        <label>
          Product
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
          </select>
        </label>
        <label>
          Into location
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      </div>
      <p className="small muted">Currently on hand here: <b>{current ?? 0}</b>{current === undefined && ' (new stock line)'}</p>
      <div className="row-2">
        <label>
          Bales received
          <input type="number" inputMode="numeric" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </label>
        <label>
          <span className="nowrap">Note <span className="opt">· optional</span></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. From top field" />
        </label>
      </div>
      <button className="btn" type="submit">Record received</button>
    </form>
  );
}

function Adjust({ state, rows, act }) {
  const [line, setLine] = useState(rows[0]?.key ?? '');
  const [count, setCount] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const row = rows.find((r) => r.key === line);
  const n = Number(count);
  const delta = row && count !== '' && Number.isInteger(n) ? n - row.onHand : null;

  const submit = (e) => {
    e.preventDefault();
    if (!row) return;
    const fullReason = detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    const action = { type: 'adjust', productId: row.productId, locationId: row.locationId, count, reason: reason === 'Other' && !detail.trim() ? '' : fullReason };
    if (!apply(state, action).error) { setCount(''); setDetail(''); }
    act(action);
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Stock count correction</h2>
      <p className="muted">Enter what was physically counted. The difference and the reason are kept in the movement history.</p>
      <label>
        Product and location
        <select value={line} onChange={(e) => setLine(e.target.value)}>
          {rows.map((r) => (
            <option key={r.key} value={r.key}>{productName(r.productId)} — {locationName(r.locationId)}</option>
          ))}
        </select>
      </label>
      {row && (
        <div className="avail-strip">
          <div><span>System count</span><b>{row.onHand}</b></div>
          <div><span>Reserved</span><b>{row.reserved}</b></div>
          <div className={delta ? 'hl' : ''}><span>Difference</span><b>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</b></div>
        </div>
      )}
      <div className="row-2">
        <label>
          Counted bales
          <input type="number" inputMode="numeric" min="0" step="1" value={count} onChange={(e) => setCount(e.target.value)} required />
        </label>
        <label>
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span className="nowrap">Detail {reason !== 'Other' && <span className="opt">· optional</span>}</span>
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. Two bales split, wrap torn" required={reason === 'Other'} />
      </label>
      <button className="btn" type="submit">Save correction</button>
    </form>
  );
}
