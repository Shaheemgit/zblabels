# India Post Tracking Barcodes

## What will change

- Replace the Instagram QR on newly generated labels with a scannable Code 128 barcode and its readable consignment number.
- Seed the 1,000 unique consignment numbers from the uploaded PDF into a shared pool. Each order receives one number only; retries keep that order's assignment and no other order can reuse it.
- When labels are generated, save each assigned number to the order and write it to the matching “Tracking number” cell in the connected Google Sheet. Orders created manually still receive a barcode, but have no sheet row to update.
- Keep existing orders and label history usable; historical labels without an assigned number remain unchanged.

## Technical approach

- Add a protected, atomic database allocator and durable barcode pool; extend saved order records with tracking and source-row details.
- Add an authenticated, batched Google Sheets write for tracking numbers, following the existing status-write pattern.
- Use a browser-safe Code 128 generator for both the on-screen label and downloadable/printable PDF.
- Validate the source barcode set, add tests for the assignment-related rules, run the project checks, and exercise the signed-in generation flow where available.