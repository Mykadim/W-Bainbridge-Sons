'use client';

import { useEffect, useRef, useState } from 'react';
import { apply, fmtTime, keyOf, locationName, productName, productUnit, userName } from '@/lib/stock';

export default function ReservationsView({ state, rows, act, prefill }) {
  const open = state.reservations.filter((r) => r.status === 'open');
  const closed = state.reservations.filter((r) => r.status !== 'open').slice(0, 8);

  return (
    <section className="grid-2">
      <div className="stack">
        <NewReservation state={state} rows={rows} act={act} prefill={prefill} />
        <BookingRule rows={rows} act={act} />
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Open reservations</h2>
              <p className="muted">Record a full or part collection or delivery, or cancel to release the bales.</p>
            </div>
          </div>
          {open.length === 0 && <p className="empty">No open reservations.</p>}
          <div className="res-list">
            {open.map((r) => <ReservationCard key={r.id} r={r} act={act} />)}
          </div>
        </div>

        {closed.length > 0 && (
          <div className="card">
            <h2>Recently closed</h2>
            <table className="table responsive compact">
              <thead>
                <tr><th>Ref</th><th>Customer</th><th>Stock</th><th className="num">Qty</th><th>Status</th></tr>
              </thead>
              <tbody>
                {closed.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Ref">{r.id}</td>
                    <td data-label="Customer">{r.customer}</td>
                    <td data-label="Stock">{productName(r.productId)} · {locationName(r.locationId)}</td>
                    <td data-label="Qty" className="num">{r.fulfilled}/{r.qty}</td>
                    <td data-label="Status"><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function NewReservation({ state, rows, act, prefill }) {
  const [line, setLine] = useState(rows[0]?.key ?? '');
  const [qty, setQty] = useState('');
  const [customer, setCustomer] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [method, setMethod] = useState('collection');
  const qtyRef = useRef(null);

  useEffect(() => {
    if (!prefill) return;
    setLine(keyOf(prefill.productId, prefill.locationId));
    qtyRef.current?.focus();
  }, [prefill]);

  const row = rows.find((r) => r.key === line);
  const n = Number(qty);
  const over = row && Number.isInteger(n) && n > row.available;

  const submit = (e) => {
    e.preventDefault();
    if (!row) return;
    const action = { type: 'reserve', productId: row.productId, locationId: row.locationId, qty, customer, orderRef, method };
    // Check the outcome locally so the form only clears on success.
    if (!apply(state, action).error) {
      setQty(''); setCustomer(''); setOrderRef('');
    }
    act(action);
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>New reservation</h2>
      <p className="muted">Reserve bales against an order so nobody else can sell them.</p>

      <label>
        Product and location
        <select value={line} onChange={(e) => setLine(e.target.value)}>
          {rows.map((r) => (
            <option key={r.key} value={r.key}>
              {productName(r.productId)} ({productUnit(r.productId)}) — {locationName(r.locationId)}
            </option>
          ))}
        </select>
      </label>

      {row && (
        <div className="avail-strip">
          <div><span>On hand</span><b>{row.onHand}</b></div>
          <div><span>Reserved</span><b>{row.reserved}</b></div>
          <div className="hl"><span>Available</span><b>{row.available}</b></div>
        </div>
      )}

      <div className="row-2">
        <label>
          Bales
          <input ref={qtyRef} type="number" inputMode="numeric" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} aria-invalid={over || undefined} required />
          {over && <small className="err">Only {row.available} available.</small>}
        </label>
        <fieldset className="seg">
          <legend>Method</legend>
          <div className="seg-track">
            {['collection', 'delivery'].map((m) => (
              <label key={m} className={method === m ? 'on' : ''}>
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
                {m === 'collection' ? 'Collection' : 'Delivery'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="row-2">
        <label>
          Customer
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Hillside Livery" required />
        </label>
        <label>
          <span className="nowrap">Order ref <span className="opt">· optional</span></span>
          <input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="ORD-2050" />
        </label>
      </div>

      <button className="btn" type="submit" disabled={!row || over}>Reserve bales</button>
    </form>
  );
}

function BookingRule({ rows, act }) {
  const candidates = rows.filter((r) => r.available > 1);
  const [line, setLine] = useState(candidates[0]?.key ?? '');
  const row = candidates.find((r) => r.key === line) ?? candidates[0];
  const qty = row ? Math.ceil((row.available * 2) / 3) : 0;

  if (!row) return null;

  return (
    <div className="card callout">
      <h3>Try the booking rule</h3>
      <p>
        The office and the yard both take an order for the same bales at the same moment. Each request is checked against
        what is left, so the second one is refused instead of overbooking.
      </p>
      <label>
        Stock line
        <select value={row.key} onChange={(e) => setLine(e.target.value)}>
          {candidates.map((r) => (
            <option key={r.key} value={r.key}>
              {productName(r.productId)} — {locationName(r.locationId)} ({r.available} available)
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn btn-outline"
        onClick={() =>
          act({
            type: 'race', productId: row.productId, locationId: row.locationId, qty,
            users: ['office', 'yard'], customers: ['Phone enquiry', 'Walk-in at yard'], method: 'collection',
          })
        }
      >
        Office and Yard both reserve {qty} now
      </button>
    </div>
  );
}

function ReservationCard({ r, act }) {
  const remaining = r.qty - r.fulfilled;
  const [qty, setQty] = useState(String(remaining));
  useEffect(() => setQty(String(remaining)), [remaining]);
  const verb = r.method === 'delivery' ? 'delivery' : 'collection';

  return (
    <article className="res">
      <header>
        <div>
          <b>{r.id}</b> · {r.customer}
          {r.orderRef && <span className="muted"> · {r.orderRef}</span>}
        </div>
        <span className={`badge badge-${r.method}`}>{r.method}</span>
      </header>
      <p className="res-line">
        {productName(r.productId)} <span className="muted">({productUnit(r.productId)})</span> · {locationName(r.locationId)}
      </p>
      <div className="res-qty">
        <span><b>{remaining}</b> still reserved</span>
        {r.fulfilled > 0 && <span className="muted">{r.fulfilled} of {r.qty} already {r.method === 'delivery' ? 'delivered' : 'collected'}</span>}
      </div>
      <p className="muted small">Reserved by {userName(r.createdBy)} · {fmtTime(r.createdAt)}</p>
      <div className="res-actions">
        <input type="number" inputMode="numeric" min="1" max={remaining} step="1" value={qty} onChange={(e) => setQty(e.target.value)} aria-label={`Bales for ${verb}`} />
        <button className="btn btn-sm" onClick={() => act({ type: 'fulfil', id: r.id, qty })}>
          Record {verb}
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => { if (window.confirm(`Cancel ${r.id} and release ${remaining} bales?`)) act({ type: 'cancel', id: r.id }); }}
        >
          Cancel
        </button>
      </div>
    </article>
  );
}
