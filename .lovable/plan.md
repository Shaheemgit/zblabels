# Zawiya Books — Shipping Label Generator

A single-page, mobile-first internal tool that turns pasted order rows into printable A4 shipping labels for India Post. No login, no database — everything stays in the browser.

## Screens

One page, stacked sections, plus a print-only label sheet.

1. **Header** — "Zawiya Books" / "Shipping Label Generator", with a small counter strip: Orders loaded · Labels ready · Labels generated.
2. **Quick actions** — New Batch, Paste Orders, Add Order, Generate Labels.
3. **Paste Orders** — big textarea, accepts rows copied straight from Excel/Sheets (tab-separated, commas also handled). Expected columns: Order ID, Customer Name, Address, PIN, Mobile, Book, Quantity, Amount. Parsed instantly into a preview table (cards on mobile) with per-row validation messages and a remove button; valid rows import even when some rows are bad.
4. **Add Order** — compact manual form with a large address box.
5. **Orders list** — cards on mobile, table on wider screens. Shows Order ID, customer, PIN, book, qty, amount, tracking, service, status (Ready / Tracking Added / Label Ready). Edit, delete, checkboxes, Select All, Clear All Orders with a confirm dialog.
6. **Shipping service** — dropdown: Speed Post, India Post Parcel, Book Post, Registered Post, Other. Applies to the labels.
7. **Tracking** — per-order field plus a bulk paste box that matches numbers line-by-line to the selected orders, with a confirmation step before applying. QR codes are generated from the number the user typed; nothing is invented and the label never calls it an official India Post barcode.
8. **Label preview** — real A4 portrait pages, 2×2 labels per page, page navigation with "Page 1 of X", back to editing. Print Labels and Download PDF buttons.
9. **Settings** — sender details (name, address 1, address 2, place, post office, district, state, PIN, mobile) saved in the browser and reused on every label.

## Label design

Black-and-white, bordered, A4-safe: ZAWIYA BOOKS / BOOK SHIPMENT header, INDIA POST + selected service, FROM block, a visually dominant TO block with large name and PIN, order details (ID, book, qty, ₹ amount), then the tracking number with its QR code beside it.

## Validation messages

Plain language only: "PIN code is required", "Add a tracking number before generating the label", "Select at least one order", "Complete sender details in Settings".

## Sample data

A "Load sample orders" action with fictional rows so the flow can be tried immediately.

## Technical notes

- React + TypeScript + Tailwind, shadcn components, single route at `/` with focused components (`OrderPaste`, `OrderList`, `TrackingPanel`, `LabelSheet`, `SenderSettings`).
- State held in a React store; sender details and service preference persisted to `localStorage`. No backend, no database.
- QR codes via the `qrcode` library rendered to canvas/SVG at high resolution so they stay scannable in print.
- PDF via `html2canvas` + `jspdf` at A4 dimensions (210×297mm), filename `Zawiya-Books-Labels-YYYY-MM-DD-N-Labels.pdf`.
- Print path uses CSS `@media print` with fixed mm-based label sizing; all app UI hidden, only the label sheet prints.
