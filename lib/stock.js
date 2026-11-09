// Core stock rules for the demo. Everything here is pure: apply(state, action)
// returns { state, message } on success or { error } when a rule blocks it.
// In production these same rules would run inside a database transaction.

export const USERS = [
  { id: 'office', name: 'Office', device: 'Desktop' },
  { id: 'yard', name: 'Yard team', device: 'Phone' },
  { id: 'driver', name: 'Haulage driver', device: 'Phone' },
];

export const PRODUCTS = [
  { id: 'wheat-straw', name: 'Wheat straw', unit: 'Big square bale' },
  { id: 'barley-straw', name: 'Barley straw', unit: 'Big square bale' },
  { id: 'oat-straw', name: 'Oat straw', unit: 'Small bale' },
  { id: 'haylage', name: 'Haylage', unit: 'Wrapped round bale' },
];

export const LOCATIONS = [
  { id: 'main-yard', name: 'Main yard barn' },
  { id: 'dutch-barn', name: 'Dutch barn' },
  { id: 'field-stack', name: 'Field stack' },
];

export const MOVE_LABELS = {
  opening: 'Opening balance',
  receive: 'Received',
  reserve: 'Reserved',
  release: 'Reservation released',
  collect: 'Collected',
  deliver: 'Delivered',
  adjust: 'Count adjustment',
};

export const userName = (id) => USERS.find((u) => u.id === id)?.name ?? id;
export const productName = (id) => PRODUCTS.find((p) => p.id === id)?.name ?? id;
export const productUnit = (id) => PRODUCTS.find((p) => p.id === id)?.unit ?? '';
export const locationName = (id) => LOCATIONS.find((l) => l.id === id)?.name ?? id;
export const keyOf = (productId, locationId) => `${productId}|${locationId}`;

export function emptyState() {
  return { stock: {}, reservations: [], movements: [], nextMove: 1, nextRes: 1001, notice: null };
}

export function reservedFor(state, key) {
  return state.reservations
    .filter((r) => r.status === 'open' && keyOf(r.productId, r.locationId) === key)
    .reduce((n, r) => n + (r.qty - r.fulfilled), 0);
}

export function availableFor(state, key) {
  return (state.stock[key] ?? 0) - reservedFor(state, key);
}

export function balances(state) {
  return Object.keys(state.stock)
    .map((key) => {
      const [productId, locationId] = key.split('|');
      const onHand = state.stock[key];
      const reserved = reservedFor(state, key);
      return { key, productId, locationId, onHand, reserved, available: onHand - reserved };
    })
    .sort(
      (a, b) =>
        PRODUCTS.findIndex((p) => p.id === a.productId) - PRODUCTS.findIndex((p) => p.id === b.productId) ||
        LOCATIONS.findIndex((l) => l.id === a.locationId) - LOCATIONS.findIndex((l) => l.id === b.locationId)
    );
}

function toQty(value, allowZero = false) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || (!allowZero && n === 0)) return null;
  return n;
}

const fail = (error) => ({ error });
const ok = (state, message) => ({ state, message });

// Append a movement, snapshotting the balance *after* the change.
function log(state, m) {
  const key = keyOf(m.productId, m.locationId);
  const onHand = state.stock[key] ?? 0;
  const reserved = reservedFor(state, key);
  const entry = { id: state.nextMove, ...m, onHand, reserved, available: onHand - reserved };
  return { ...state, movements: [entry, ...state.movements], nextMove: state.nextMove + 1 };
}

export function apply(state, a) {
  const user = a.user || 'office';
  const at = a.at || new Date().toISOString();
  const key = keyOf(a.productId, a.locationId);
  const where = () => `${productName(a.productId)} at ${locationName(a.locationId)}`;

  switch (a.type) {
    case 'open': {
      const qty = toQty(a.qty, true);
      if (qty === null) return fail('Enter a whole number of bales.');
      const s = { ...state, stock: { ...state.stock, [key]: qty } };
      return ok(
        log(s, { type: 'opening', user, at, productId: a.productId, locationId: a.locationId, qty }),
        `Opening balance set for ${where()}.`
      );
    }

    case 'receive': {
      const qty = toQty(a.qty);
      if (!qty) return fail('Enter how many bales were received.');
      const s = { ...state, stock: { ...state.stock, [key]: (state.stock[key] ?? 0) + qty } };
      return ok(
        log(s, {
          type: 'receive', user, at, productId: a.productId, locationId: a.locationId, qty,
          note: (a.note || '').trim(),
        }),
        `${qty} bales received into ${where()}.`
      );
    }

    case 'reserve': {
      if (!(key in state.stock)) return fail(`${where()} has no stock record.`);
      const qty = toQty(a.qty);
      if (!qty) return fail('Enter how many bales to reserve.');
      const customer = (a.customer || '').trim();
      if (!customer) return fail('Enter the customer name.');
      const available = availableFor(state, key);
      // The booking rule: never reserve more than is free to sell.
      if (qty > available) {
        return fail(`Cannot reserve ${qty}: only ${available} available of ${where()}.`);
      }
      const id = `R-${state.nextRes}`;
      const method = a.method === 'delivery' ? 'delivery' : 'collection';
      const res = {
        id, customer, orderRef: (a.orderRef || '').trim(), productId: a.productId, locationId: a.locationId,
        qty, fulfilled: 0, method, status: 'open', createdBy: user, createdAt: at, closedAt: null,
      };
      const s = { ...state, reservations: [res, ...state.reservations], nextRes: state.nextRes + 1 };
      return ok(
        log(s, {
          type: 'reserve', user, at, productId: a.productId, locationId: a.locationId, qty,
          ref: id, customer, note: `For ${method}${res.orderRef ? ` · ${res.orderRef}` : ''}`,
        }),
        `${id}: ${qty} reserved for ${customer}.`
      );
    }

    case 'fulfil': {
      const r = state.reservations.find((x) => x.id === a.id);
      if (!r || r.status !== 'open') return fail('That reservation is no longer open.');
      const remaining = r.qty - r.fulfilled;
      const qty = toQty(a.qty);
      if (!qty) return fail('Enter how many bales left the yard.');
      if (qty > remaining) return fail(`Only ${remaining} still reserved on ${r.id}.`);
      const k = keyOf(r.productId, r.locationId);
      const onHand = state.stock[k] ?? 0;
      if (qty > onHand) return fail(`Only ${onHand} on hand at ${locationName(r.locationId)}.`);
      const left = remaining - qty;
      const reservations = state.reservations.map((x) =>
        x.id === r.id
          ? { ...x, fulfilled: x.fulfilled + qty, status: left === 0 ? 'completed' : 'open', closedAt: left === 0 ? at : null }
          : x
      );
      const s = { ...state, stock: { ...state.stock, [k]: onHand - qty }, reservations };
      const verb = r.method === 'delivery' ? 'delivered' : 'collected';
      return ok(
        log(s, {
          type: r.method === 'delivery' ? 'deliver' : 'collect', user, at,
          productId: r.productId, locationId: r.locationId, qty, ref: r.id, customer: r.customer,
          note: left ? `Part ${r.method}: ${left} still reserved` : `${r.method[0].toUpperCase()}${r.method.slice(1)} complete`,
        }),
        `${qty} ${verb} on ${r.id}${left ? `, ${left} still reserved` : ' — reservation complete'}.`
      );
    }

    case 'cancel': {
      const r = state.reservations.find((x) => x.id === a.id);
      if (!r || r.status !== 'open') return fail('That reservation is no longer open.');
      const released = r.qty - r.fulfilled;
      const reservations = state.reservations.map((x) =>
        x.id === r.id ? { ...x, status: 'cancelled', closedAt: at } : x
      );
      return ok(
        log({ ...state, reservations }, {
          type: 'release', user, at, productId: r.productId, locationId: r.locationId, qty: released,
          ref: r.id, customer: r.customer, note: (a.reason || 'Order cancelled').trim(),
        }),
        `${r.id} cancelled — ${released} bales back in available stock.`
      );
    }

    case 'adjust': {
      if (!(key in state.stock)) return fail(`${where()} has no stock record.`);
      const count = toQty(a.count, true);
      if (count === null) return fail('Enter the counted number of bales.');
      const reason = (a.reason || '').trim();
      if (!reason) return fail('A reason is required for every stock adjustment.');
      const reserved = reservedFor(state, key);
      if (count < reserved) {
        return fail(`Counted ${count}, but ${reserved} are already reserved. Release or amend reservations first.`);
      }
      const delta = count - state.stock[key];
      if (delta === 0) return fail('Count matches the system — nothing to adjust.');
      const s = { ...state, stock: { ...state.stock, [key]: count } };
      return ok(
        log(s, { type: 'adjust', user, at, productId: a.productId, locationId: a.locationId, qty: delta, note: reason }),
        `${where()} corrected to ${count} (${delta > 0 ? '+' : ''}${delta}).`
      );
    }

    // Two users try to reserve the same stock at the same moment. Each request is
    // checked against the balance left by the one before it, so the second is refused
    // rather than overbooking.
    case 'race': {
      const [u1, u2] = a.users;
      const r1 = apply(state, { ...a, type: 'reserve', user: u1, customer: a.customers[0], at });
      const s1 = r1.error ? state : r1.state;
      const r2 = apply(s1, { ...a, type: 'reserve', user: u2, customer: a.customers[1], at });
      const s2 = r2.error ? s1 : r2.state;
      const line = (u, r) => `${userName(u)}: ${r.error ? `refused — ${r.error}` : r.message}`;
      return ok(s2, `${line(u1, r1)}\n${line(u2, r2)}`);
    }

    default:
      return fail(`Unknown action ${a.type}`);
  }
}

// Sample stock so the demo opens with something to look at.
export function seedState() {
  let s = emptyState();
  let t = Date.parse('2026-11-02T07:30:00Z');
  const step = (a) => {
    t += 23 * 60000;
    const r = apply(s, { ...a, at: new Date(t).toISOString() });
    if (r.error) throw new Error(r.error);
    s = r.state;
  };
  [
    ['wheat-straw', 'main-yard', 120],
    ['wheat-straw', 'dutch-barn', 64],
    ['barley-straw', 'main-yard', 85],
    ['barley-straw', 'field-stack', 40],
    ['oat-straw', 'dutch-barn', 210],
    ['haylage', 'main-yard', 48],
    ['haylage', 'field-stack', 26],
  ].forEach(([productId, locationId, qty]) => step({ type: 'open', user: 'office', productId, locationId, qty }));

  step({ type: 'reserve', user: 'office', productId: 'wheat-straw', locationId: 'main-yard', qty: 30, customer: 'Hillside Livery', orderRef: 'ORD-2041', method: 'collection' });
  step({ type: 'reserve', user: 'office', productId: 'haylage', locationId: 'main-yard', qty: 12, customer: 'Moor End Stables', orderRef: 'ORD-2042', method: 'delivery' });
  step({ type: 'reserve', user: 'office', productId: 'barley-straw', locationId: 'main-yard', qty: 40, customer: 'Greenbank Dairy', orderRef: 'ORD-2043', method: 'delivery' });
  step({ type: 'fulfil', user: 'driver', id: 'R-1003', qty: 24 });
  step({ type: 'receive', user: 'yard', productId: 'oat-straw', locationId: 'dutch-barn', qty: 60, note: 'Brought in from top field' });
  step({ type: 'adjust', user: 'yard', productId: 'haylage', locationId: 'field-stack', count: 25, reason: 'Damaged: split wrap' });
  return s;
}

export function describeChange(m) {
  switch (m.type) {
    case 'opening': return `${m.qty} on hand`;
    case 'receive': return `+${m.qty} on hand`;
    case 'reserve': return `${m.qty} reserved`;
    case 'release': return `${m.qty} released`;
    case 'collect':
    case 'deliver': return `−${m.qty} on hand`;
    case 'adjust': return `${m.qty > 0 ? '+' : '−'}${Math.abs(m.qty)} on hand`;
    default: return String(m.qty);
  }
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ---- CSV export ----
function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  // Guard against spreadsheet formula injection from free-text fields.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadCSV(filename, rows) {
  const blob = new Blob(['﻿' + toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function balancesCSV(rows) {
  return [
    ['Product', 'Unit', 'Location', 'On hand', 'Reserved', 'Available'],
    ...rows.map((r) => [productName(r.productId), productUnit(r.productId), locationName(r.locationId), r.onHand, r.reserved, r.available]),
  ];
}

export function movementsCSV(movements) {
  return [
    ['Date/time', 'User', 'Movement', 'Product', 'Location', 'Quantity', 'Reference', 'Customer', 'Note / reason', 'On hand after', 'Reserved after', 'Available after'],
    ...movements.map((m) => [
      m.at, userName(m.user), MOVE_LABELS[m.type], productName(m.productId), locationName(m.locationId),
      m.qty, m.ref ?? '', m.customer ?? '', m.note ?? '', m.onHand, m.reserved, m.available,
    ]),
  ];
}
