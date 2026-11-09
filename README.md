# Artic Technologies – Stock management demo

Demo for the W Bainbridge & Sons stock proposal. Next.js (App Router), plain JavaScript, no database. Sample data is saved in the browser (localStorage).

## Run

```bash
npm install
npm run dev      # http://localhost:4000
```

## What's in it

| Tab | Shows |
| --- | --- |
| Stock | On hand / reserved / available by product and location, search, CSV export |
| Reservations | Reserve against an order (booking rule blocks over-reserving), full or part collection/delivery, cancel to release, two-user clash demo |
| Receive & count | Record bales received; stock count corrections with a required reason |
| History | Every movement with who, when and the resulting balance; filters and CSV export |
| Walkthrough | Steps through the "From reservation to collection" table from the proposal |

Switch "Signed in as" (Office / Yard team / Haulage driver) to show changes recorded against different people. "Reset demo" restores the sample stock.

## Code

- `lib/stock.js` – all stock rules as pure functions (`apply(state, action)`), sample data and CSV export
- `components/` – one file per tab, `StockApp.js` holds state and persistence
