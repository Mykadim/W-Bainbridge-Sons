'use client';

import { useState } from 'react';
import {
  LOCATIONS, MOVE_LABELS, PRODUCTS, describeChange, downloadCSV, fmtTime, locationName, movementsCSV, productName, userName,
} from '@/lib/stock';

export default function HistoryView({ state }) {
  const [product, setProduct] = useState('all');
  const [loc, setLoc] = useState('all');
  const [type, setType] = useState('all');

  const list = state.movements.filter(
    (m) =>
      (product === 'all' || m.productId === product) &&
      (loc === 'all' || m.locationId === loc) &&
      (type === 'all' || m.type === type)
  );

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Movement history</h2>
          <p className="muted">Every change, who made it and when, with the balance it left behind.</p>
        </div>
        <button className="btn btn-outline" onClick={() => downloadCSV('stock-movements.csv', movementsCSV(list))}>
          Export CSV
        </button>
      </div>

      <div className="filters">
        <select value={product} onChange={(e) => setProduct(e.target.value)} aria-label="Product">
          <option value="all">All products</option>
          {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
        </select>
        <select value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Location">
          <option value="all">All locations</option>
          {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Movement type">
          <option value="all">All movements</option>
          {Object.entries(MOVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <table className="table responsive compact">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Movement</th>
            <th>Stock</th>
            <th>Change</th>
            <th className="num">On hand</th>
            <th className="num">Reserved</th>
            <th className="num">Available</th>
            <th>Ref / reason</th>
          </tr>
        </thead>
        <tbody>
          {list.map((m) => (
            <tr key={m.id}>
              <td data-label="When" className="nowrap">{fmtTime(m.at)}</td>
              <td data-label="Who">{userName(m.user)}</td>
              <td data-label="Movement"><span className={`badge mv-${m.type}`}>{MOVE_LABELS[m.type]}</span></td>
              <td data-label="Stock">{productName(m.productId)} · {locationName(m.locationId)}</td>
              <td data-label="Change" className="nowrap">{describeChange(m)}</td>
              <td data-label="On hand" className="num">{m.onHand}</td>
              <td data-label="Reserved" className="num">{m.reserved}</td>
              <td data-label="Available" className="num"><b>{m.available}</b></td>
              <td data-label="Ref / reason">
                {[m.ref, m.customer, m.note].filter(Boolean).join(' · ') || <span className="muted">—</span>}
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={9} className="empty">No movements match these filters.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
