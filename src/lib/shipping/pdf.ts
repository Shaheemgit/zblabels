import jsPDF from "jspdf";
import QRCode from "qrcode";
import { senderLines, type Order, type Sender } from "./types";

export const LABELS_PER_PAGE = 4;

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 512 });
}

export function pdfFileName(count: number): string {
  const d = new Date();
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
  return `Zawiya-Books-Labels-${date}-${count}-Labels.pdf`;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const GAP = 6;
const LABEL_W = (PAGE_W - MARGIN * 2 - GAP) / 2;
const LABEL_H = (PAGE_H - MARGIN * 2 - GAP) / 2;

function drawLabel(
  doc: jsPDF,
  order: Order,
  sender: Sender,
  qr: string | null,
  x: number,
  y: number,
) {
  const pad = 5;
  const innerW = LABEL_W - pad * 2;
  const left = x + pad;
  let cursor = y + pad + 4;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, LABEL_W, LABEL_H);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ZAWIYA BOOKS", left, cursor);
  cursor += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("BOOK SHIPMENT", left, cursor);
  cursor += 4.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("INDIA POST", left, cursor);
  doc.text((order.service || "").toUpperCase(), x + LABEL_W - pad, cursor, { align: "right" });
  cursor += 2.5;
  doc.setLineWidth(0.3);
  doc.line(left, cursor, x + LABEL_W - pad, cursor);
  cursor += 5;

  // FROM
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("FROM", left, cursor);
  cursor += 4;
  doc.setFontSize(8.5);
  doc.text(sender.name || "-", left, cursor);
  cursor += 3.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  for (const line of senderLines(sender)) {
    const wrapped = doc.splitTextToSize(line, innerW) as string[];
    for (const w of wrapped) {
      doc.text(w, left, cursor);
      cursor += 3.2;
    }
  }
  doc.text(`PIN: ${sender.pin}   Mobile: ${sender.mobile}`, left, cursor);
  cursor += 3.5;
  doc.setLineWidth(0.3);
  doc.line(left, cursor, x + LABEL_W - pad, cursor);
  cursor += 5.5;

  // TO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TO", left, cursor);
  cursor += 6;
  doc.setFontSize(13);
  for (const w of doc.splitTextToSize(order.customer || "-", innerW) as string[]) {
    doc.text(w, left, cursor);
    cursor += 5.4;
  }
  cursor += 0.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const w of doc.splitTextToSize(order.address || "-", innerW) as string[]) {
    doc.text(w, left, cursor);
    cursor += 4;
  }
  cursor += 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`PIN: ${order.pin}`, left, cursor);
  cursor += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Mobile: ${order.mobile || "-"}`, left, cursor);
  cursor += 3.5;
  doc.setLineWidth(0.3);
  doc.line(left, cursor, x + LABEL_W - pad, cursor);
  cursor += 5;

  // Order details
  doc.setFontSize(7.5);
  doc.text(`Order ID: ${order.orderId}`, left, cursor);
  cursor += 3.4;
  for (const w of doc.splitTextToSize(`Book: ${order.book || "-"}`, innerW) as string[]) {
    doc.text(w, left, cursor);
    cursor += 3.4;
  }
  doc.text(`Quantity: ${order.qty}    Amount: Rs. ${order.amount}`, left, cursor);

  // Tracking block anchored to the bottom
  const trackTop = y + LABEL_H - 30;
  doc.setLineWidth(0.3);
  doc.line(left, trackTop, x + LABEL_W - pad, trackTop);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TRACKING / CONSIGNMENT NO.", left, trackTop + 5);
  doc.setFontSize(11);
  doc.text(order.tracking || "-", left, trackTop + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("QR of the tracking number entered above.", left, trackTop + 16);
  doc.text("Not an official India Post barcode.", left, trackTop + 19);
  if (qr) doc.addImage(qr, "PNG", x + LABEL_W - pad - 24, trackTop + 3, 24, 24);
}

export async function buildLabelsPdf(orders: Order[], sender: Sender): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const qrs = await Promise.all(
    orders.map((o) => (o.tracking.trim() ? qrDataUrl(o.tracking.trim()) : Promise.resolve(null))),
  );

  orders.forEach((order, i) => {
    const slot = i % LABELS_PER_PAGE;
    if (i > 0 && slot === 0) doc.addPage();
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    drawLabel(
      doc,
      order,
      sender,
      qrs[i] ?? null,
      MARGIN + col * (LABEL_W + GAP),
      MARGIN + row * (LABEL_H + GAP),
    );
  });

  return doc;
}
