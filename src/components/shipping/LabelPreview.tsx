import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LABELS_PER_PAGE } from "@/lib/shipping/pdf";
import { renderBarcodeSvg } from "@/lib/shipping/barcode";
import { amountText, codAmountText, INDIA_POST_CUSTOMER_ID, payableText, senderLines, type Order, type Sender } from "@/lib/shipping/types";
import { parseBooks } from "@/lib/shipping/whatsapp";

function bookNames(o: Order): string[] {
  const names = parseBooks(o.book || "").map((b) => b.name).filter(Boolean);
  return names;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function LabelPreview({ orders, sender }: { orders: Order[]; sender: Sender }) {
  const pages = chunk(orders, LABELS_PER_PAGE);
  const [page, setPage] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth ?? 0;
      const mmToPx = 96 / 25.4;
      setScale(Math.min(1, w / (210 * mmToPx)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (page > pages.length - 1) setPage(Math.max(0, pages.length - 1));
  }, [pages.length, page]);

  if (pages.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          Page {page + 1} of {pages.length}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page >= pages.length - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div ref={wrapRef} className="overflow-hidden print:overflow-visible">
        <div
          className="print-sheet origin-top-left"
          style={{ transform: `scale(${scale})`, height: `calc(297mm * ${scale} * ${1})` }}
        >
          {pages.map((pageOrders, i) => (
            <div
              key={i}
              className="a4-page"
              style={{ display: i === page ? "grid" : "none" }}
              data-page-index={i}
            >
              {pageOrders.map((order) => (
                <LabelCard key={order.id} order={order} sender={sender} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LabelCard({
  order,
  sender,
}: {
  order: Order;
  sender: Sender;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const node = barcodeRef.current;
    if (!node || !order.tracking) return;
    renderBarcodeSvg(node, order.tracking);
  }, [order.tracking]);

  return (
    <div className="zlabel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "2mm", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13pt", fontWeight: 700, letterSpacing: "0.02em" }}>
            ZAWIYA BOOKS
          </div>
          <div style={{ fontSize: "6.5pt", letterSpacing: "0.12em" }}>BOOK SHIPMENT</div>
          <div style={{ fontSize: "8.5pt", fontWeight: 700, marginTop: "1.5mm", paddingBottom: "1.5mm", borderBottom: "0.4mm solid #000" }}>
            {order.post || "BOOK DELIVERY"} · {order.payment.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "10.5pt", fontWeight: 700 }}>Customer ID: {INDIA_POST_CUSTOMER_ID}</div>
          {order.payment === "COD" && (
            <div style={{ fontSize: "11.5pt", fontWeight: 700 }}>COD Amount: {codAmountText(order)}</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.5mm", paddingBottom: "1.2mm", borderBottom: "0.3mm solid #000" }}>
        <div style={{ fontSize: "6.5pt", fontWeight: 700, letterSpacing: "0.1em" }}>FROM</div>
        <div style={{ fontSize: "8pt", fontWeight: 700 }}>{sender.name || "-"}</div>
        <div style={{ fontSize: "7pt", lineHeight: 1.35 }}>
          {senderLines(sender).map((l) => (
            <div key={l}>{l}</div>
          ))}
          <div>PIN: {sender.pin}{sender.mobile ? ` · Mobile: ${sender.mobile}` : ""}</div>
        </div>
      </div>

      <div style={{ marginTop: "1.5mm", paddingBottom: "1.2mm", borderBottom: "0.3mm solid #000" }}>
        <div style={{ fontSize: "7.5pt", fontWeight: 700, letterSpacing: "0.1em" }}>TO</div>
        <div style={{ fontSize: "13pt", fontWeight: 700, lineHeight: 1.15, marginTop: "1mm" }}>
          {order.customer}
        </div>
        <div style={{ fontSize: "9pt", lineHeight: 1.35, marginTop: "1mm" }}>{order.address}</div>
        <div style={{ fontSize: "12.5pt", fontWeight: 700, marginTop: "1.5mm" }}>
          PIN: {order.pin}
        </div>
        <div style={{ fontSize: "9pt" }}>Mobile: {order.mobile || "-"}</div>
      </div>

      <div style={{ marginTop: "1.5mm", display: "flex", justifyContent: "space-between", gap: "2mm" }}>
        <div style={{ fontSize: "7.5pt", lineHeight: 1.4, minWidth: 0 }}>
          <div>Order ID: {order.orderId} · Qty: {order.qty}</div>
          {bookNames(order).map((n, i) => (
            <div key={i}>{bookNames(order).length > 1 ? `Book ${i + 1}: ${n}` : `Book: ${n}`}</div>
          ))}
          {bookNames(order).length === 0 && <div>Book: -</div>}
          <div>{amountText(order)}</div>
          {order.payment === "COD" && (
            <div style={{ fontWeight: 700 }}>{payableText(order)}</div>
          )}
          <div style={{ fontSize: "8pt", fontWeight: 700, marginTop: "1mm" }}>Thank you for shopping with Zawiya Books!</div>
        </div>
        {order.tracking && (
          <div style={{ width: "35mm", flexShrink: 0, textAlign: "center" }}>
            <svg ref={barcodeRef} aria-label={`India Post tracking barcode ${order.tracking}`} />
            <div style={{ fontSize: "7pt", marginTop: "1mm" }}>{order.tracking}</div>
          </div>
        )}
      </div>
    </div>
  );
}
