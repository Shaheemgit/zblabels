<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Shipping label layouts and PDFs are generated in the browser; India Post consignment numbers are assigned atomically from a shared Lovable Cloud pool and written back to their source Google Sheet rows. Why: tracking numbers must remain unique across devices and be recoverable after refresh, while Google Sheets credentials stay server-side.

The single maintained order sheet (`ORDER_SHEET` in `src/lib/shipping/sheet.ts`) is the source of orders; the Order Management dashboard reads it and signed-in users write stage statuses back to its status columns through `src/lib/shipping/sheet.functions.ts` (Google Sheets connector gateway, server-side only). Why: one connected sheet per the owner; stage updates must land in the sheet itself, and connector secrets must never reach the browser.
