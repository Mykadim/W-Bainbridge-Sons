'use client';

import { useState } from 'react';
import { apply, emptyState, userName } from '@/lib/stock';

// Reproduces the "From reservation to collection" table from the proposal,
// using the same rules as the main app on its own isolated sample stock.
const LINE = { productId: 'wheat-straw', locationId: 'main-yard' };

const STEPS = [
  {
    label: 'Reserve 30 for collection',
    story: 'A customer rings the office for 30 bales. The office checks availability and reserves them against the order.',
    action: { type: 'reserve', user: 'office', ...LINE, qty: 30, customer: 'Sample customer', orderRef: 'ORD-1', method: 'collection' },
  },
  {
    label: 'Customer collects 30',
    story: 'The customer arrives. The yard team records the collection on a phone; on hand drops and the reservation closes.',
    action: { type: 'fulfil', user: 'yard', id: 'R-1001', qty: 30 },
  },
  {
    label: 'Record 40 bales received',
    story: 'Forty bales come in from the field. The yard records them and the office sees the new position straight away.',
    action: { type: 'receive', user: 'yard', ...LINE, qty: 40, note: 'Brought in from field' },
  },
];

function start() {
  return apply(emptyState(), { type: 'open', user: 'office', ...LINE, qty: 120, at: new Date().toISOString() }).state;
}

export default function GuidedDemo() {
  const [state, setState] = useState(start);
  const [done, setDone] = useState(0);

  const next = () => {
    const r = apply(state, { ...STEPS[done].action, at: new Date().toISOString() });
    if (!r.error) { setState(r.state); setDone(done + 1); }
  };
  const restart = () => { setState(start()); setDone(0); };

  const rows = [...state.movements].reverse();

  return (
    <section className="grid-2 walk">
      <div className="card">
        <p className="eyebrow">The demo</p>
        <h2>From reservation to collection</h2>
        <p className="muted">Sample wheat straw, one storage location, opening balance of 120 bales. Step through to see how each action changes the stock.</p>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.label} className={i < done ? 'done' : i === done ? 'current' : ''}>
              <span className="dot">{i < done ? '✓' : i + 1}</span>
              <div>
                <b>{s.label}</b>
                <p>{s.story}</p>
                <small className="muted">Recorded by {userName(s.action.user)}</small>
              </div>
            </li>
          ))}
        </ol>
        <div className="btn-row">
          {done < STEPS.length ? (
            <button className="btn" onClick={next}>Next: {STEPS[done].label}</button>
          ) : (
            <p className="ok-text">Walkthrough complete — every step is in the movement history.</p>
          )}
          <button className="btn btn-ghost" onClick={restart} disabled={done === 0}>Restart</button>
        </div>
      </div>

      <div className="card">
        <h2>Stock position</h2>
        <table className="table walk-table">
          <thead>
            <tr><th>Movement</th><th className="num">On hand</th><th className="num">Reserved</th><th className="num">Available</th></tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.id} className={i === rows.length - 1 && i > 0 ? 'flash' : ''}>
                <td>{i === 0 ? 'Opening balance' : STEPS[i - 1].label}</td>
                <td className="num">{m.onHand}</td>
                <td className="num">{m.reserved}</td>
                <td className="num"><b>{m.available}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Example uses bale counts at one storage location. Available = on hand less reserved.</p>
        <div className="callout small-callout">
          <b>If the plan changes</b>
          <p>A cancellation releases the reserved bales. A part collection deducts only what left the yard and keeps the rest reserved. A count correction records the difference and its reason. Try these on the <b>Reservations</b> and <b>Receive &amp; count</b> tabs.</p>
        </div>
      </div>
    </section>
  );
}
