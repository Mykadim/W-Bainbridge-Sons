'use client';

import { useEffect, useRef, useState } from 'react';
import { LOCATIONS, balancesCSV, downloadCSV, locationName, productName, productUnit } from '@/lib/stock';

export default function StockView({ rows, state, onReserve }) {
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('all');

  const term = q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (loc === 'all' || r.locationId === loc) &&
      (!term || `${productName(r.productId)} ${productUnit(r.productId)}`.toLowerCase().includes(term))
  );
  const sum = (k) => filtered.reduce((n, r) => n + r[k], 0);
  const openRes = state.reservations.filter((r) => r.status === 'open').length;

  return (
    <section className="stack">
      <div className="tiles">
        <Tile label="On hand" value={sum('onHand')} sub="bales in store" />
        <Tile label="Reserved" value={sum('reserved')} sub="held against orders" />
        <Tile label="Available to sell" value={sum('available')} sub="on hand less reserved" accent />
        <Tile label="Open reservations" value={openRes} sub="awaiting collection or delivery" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Stock by product and location</h2>
            <p className="muted">Check what is free before saying yes to an order.</p>
          </div>
          <button className="btn btn-outline" onClick={() => downloadCSV('stock-balances.csv', balancesCSV(filtered))}>
            Export CSV
          </button>
        </div>

        <div className="filters">
          <input type="search" placeholder="Search product, e.g. haylage" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search product" />
          <select value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Storage location">
            <option value="all">All locations</option>
            {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <table className="table responsive">
          <thead>
            <tr>
              <th>Product</th>
              <th>Location</th>
              <th className="num">On hand</th>
              <th className="num">Reserved</th>
              <th className="num">Available</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const pct = r.onHand ? Math.round((r.available / r.onHand) * 100) : 0;
              const level = r.available <= 0 ? 'none' : pct < 25 ? 'low' : 'ok';
              return (
                <tr key={r.key}>
                  <td data-label="Product">
                    <b>{productName(r.productId)}</b>
                    <small className="muted block">{productUnit(r.productId)}</small>
                  </td>
                  <td data-label="Location">{locationName(r.locationId)}</td>
                  <td data-label="On hand" className="num">{r.onHand}</td>
                  <td data-label="Reserved" className="num">{r.reserved}</td>
                  <td data-label="Available" className="num">
                    <span className={`avail avail-${level}`}>{r.available}</span>
                    <span className="bar" aria-hidden="true"><span style={{ width: `${Math.max(0, pct)}%` }} className={`bar-${level}`} /></span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-sm" disabled={r.available <= 0} onClick={() => onReserve(r)}>
                      Reserve
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="empty">No stock matches that search.</td></tr>
            )}
          </tbody>
        </table>
        <p className="hint">Available = on hand less reserved. Numbers update the moment anyone records a reservation, collection, delivery or count.</p>
      </div>
    </section>
  );
}

// Animates a number from its previous value to the new one.
function useCountUp(value, duration = 700) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(a + (value - a) * eased);
      setShown(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

function Tile({ label, value, sub, accent }) {
  const shown = useCountUp(value);
  return (
    <div className={`tile${accent ? ' tile-accent' : ''}`}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{shown.toLocaleString('en-GB')}</span>
      <span className="tile-sub">{sub}</span>
    </div>
  );
}
