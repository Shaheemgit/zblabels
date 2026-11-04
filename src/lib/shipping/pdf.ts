import jsPDF from "jspdf";
import QRCode from "qrcode";
import { codAmountText, orderTotals, INDIA_POST_CUSTOMER_ID, senderLines, type Order, type Sender } from "./types";
import { parseBooks } from "./whatsapp";

export const LABELS_PER_PAGE = 4;
export const INSTAGRAM_URL = "https://www.instagram.com/zawiyabooks.online/";

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
  let cursor = y + pad + 4 + 30; // 3 cm blank space on top

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
  doc.text(`${order.post || "BOOK DELIVERY"} · ${order.payment.toUpperCase()}`, left, cursor, { maxWidth: innerW });
  cursor += 2.5;
  doc.setLineWidth(0.3);
  doc.line(left, cursor, x + LABEL_W - pad, cursor);
  cursor += 4;

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
  doc.text(`PIN: ${sender.pin}${sender.mobile ? `   Mobile: ${sender.mobile}` : ""}`, left, cursor);
  cursor += 3.5;
  doc.setLineWidth(0.3);
  doc.line(left, cursor, x + LABEL_W - pad, cursor);
  cursor += 4;

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
  cursor += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Mobile: ${order.mobile || "-"}`, left, cursor);
  cursor += 3.5;
  doc.setLineWidth(0.3);
  doc.line(left, cursor, x + LABEL_W - pad, cursor);
  cursor += 4;

  // Order details
  doc.setFontSize(7.5);
  doc.text(`Order ID: ${order.orderId}`, left, cursor);
  cursor += 3.4;
  const bookNames = parseBooks(order.book || "").map((b) => b.name).filter(Boolean);
  const bookLines = bookNames.length > 1
    ? bookNames.map((n, i) => `Book ${i + 1}: ${n}`)
    : [`Book: ${bookNames[0] || order.book || "-"}`];
  for (const line of bookLines) {
    for (const w of doc.splitTextToSize(line, innerW) as string[]) {
      doc.text(w, left, cursor);
      cursor += 3.4;
    }
  }
  doc.text(`Quantity: ${order.qty}`, left, cursor);
  cursor += 3.4;
  doc.setFont("helvetica", "bold");
  doc.text(`Amount: ${amountText(order, "Rs. ")}`, left, cursor, { maxWidth: innerW - 2 });
  cursor += 3.4;
  if (orderTotals(order).payable > orderTotals(order).total) {
    doc.text(payableText(order, "Rs. "), left, cursor, { maxWidth: innerW - 2 });
    cursor += 3.4;
  }
  doc.setFont("helvetica", "normal");

  // Thank-you note and Instagram QR anchored to the bottom
  const trackTop = y + LABEL_H - 22;
  doc.setLineWidth(0.3);
  doc.line(left, trackTop, x + LABEL_W - pad, trackTop);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Thank you for shopping with Zawiya Books!", left, trackTop + 7, { maxWidth: innerW - 20 });
  if (qr) doc.addImage(qr, "PNG", x + LABEL_W - pad - 18, trackTop + 2, 18, 18);
}

export async function buildLabelsPdf(orders: Order[], sender: Sender): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const qr = await qrDataUrl(INSTAGRAM_URL);

  orders.forEach((order, i) => {
    const slot = i % LABELS_PER_PAGE;
    if (i > 0 && slot === 0) doc.addPage();
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    drawLabel(
      doc,
      order,
      sender,
      qr,
      MARGIN + col * (LABEL_W + GAP),
      MARGIN + row * (LABEL_H + GAP),
    );
  });

  return doc;
}
