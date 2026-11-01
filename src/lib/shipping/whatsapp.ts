// Messages mirror the formulas in the Zawiya Books Google Sheet.
export type Stage = "order" | "payment" | "dispatch" | "feedback";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "order", label: "📱 Order" },
  { id: "payment", label: "💳 Payment Received" },
  { id: "dispatch", label: "📦 Dispatched" },
  { id: "feedback", label: "⭐ Feedback" },
];

export type MsgInput = { name: string; books: string; cod: boolean };

const LINE = "━━━━━━━━━━━━━━━━━━";

export function waPhone(raw: string): string {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d.slice(1);
  return d.length === 10 ? `91${d}` : d;
}

export function parseBooks(books: string) {
  return books
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/₹\s*([0-9,]+)/);
      return { name: p.replace(/\s*💰?\s*₹.*$/, "").trim(), price: m ? Number(m[1].replace(/,/g, "")) || 0 : 0 };
    });
}

const fmt = (n: number) => n.toLocaleString("en-IN");

export function stageMessage(stage: Stage, { name, books, cod }: MsgInput): string {
  if (stage === "payment")
    return `👋 Hi ${name},\n\n✅ Your payment has been received successfully!\n\n📚 Thank you for choosing Zawiya Books. Your order is now confirmed, and we'll notify you once your package is dispatched.\n\n❤️ We appreciate your support!\n\n📖 — Zawiya Books`;
  if (stage === "dispatch")
    return `👋 Hi ${name},\n\n📦 Great news! Your order has been dispatched successfully! 🎉\n\n🚚 Your package has been handed over to India Post and is on its way to you.\n\n❤️ We hope you enjoy your reading experience!\n\n🙏 Thank you for choosing Zawiya Books!`;
  if (stage === "feedback")
    return `👋 പ്രിയപ്പെട്ട ${name},\n\n📦 നിങ്ങൾ ഓർഡർ ചെയ്ത പുസ്തകങ്ങൾ സുരക്ഷിതമായി കൈകളിൽ എത്തിയെന്ന് കരുതുന്നു. ❤️\n\n📚 നിങ്ങളുടെ പുസ്തകങ്ങൾ:\n${books}\n\n✨ പുസ്തകങ്ങൾ വായിച്ച അനുഭവം ഞങ്ങളുമായി പങ്കുവെക്കുമല്ലോ? നിങ്ങളുടെ അഭിപ്രായം ഞങ്ങളുടെ Instagram പോസ്റ്റിന് താഴെ ഒരു Comment ആയി രേഖപ്പെടുത്തണേ. ❤️\n\n📸 ഞങ്ങളുടെ Instagram പേജ് Follow ചെയ്യാനും മറക്കല്ലേ:\nhttps://www.instagram.com/zawiyabooks.online/\n\n🙏 ഒരുപാട് നന്ദി!`;

  const list = parseBooks(books);
  const subtotal = list.reduce((s, b) => s + b.price, 0);
  const codCharge = cod ? Math.round(subtotal * 0.02) : 0;
  const items = list.map((b) => `▪ ${b.name} — ₹${fmt(b.price)}`).join("\n");
  const head = `👋 Hi ${name},\n\n🎉 *YOUR ORDER HAS BEEN RECEIVED!*\nThank you for shopping with Zawiya Books.\n\n${LINE}\n📦 *ORDER SUMMARY*\n${LINE}\n\n📚 *Books ordered (${list.length}):*\n${items}\n\n${LINE}\n💰 *PAYMENT DETAILS*\n${LINE}\nBook subtotal: ₹${fmt(subtotal)}\n`;
  if (cod)
    return `${head}COD handling charge (2%): ₹${fmt(codCharge)}\n──────────────────\n💵 *TOTAL PAYABLE: ₹${fmt(subtotal + codCharge)}*\n\n💳 Payment method: Cash on Delivery\n\n📦 Your order will be dispatched soon.\n\n✅ *Please reply OK to confirm your order.*\n\n🙏 Thank you for choosing Zawiya Books!`;
  return `${head}🚚 All prices are inclusive of delivery charges.\n──────────────────\n💵 *TOTAL TO PAY: ₹${fmt(subtotal)}*\n\n💳 Payment method: PREPAID\n\n🔗 *UPI ID:* 8921291146@ptsbi\n\n✅ Please complete the payment to confirm your order.\n\n📸 Please share the payment screenshot on WhatsApp after completing the payment so we can confirm your order.\n\n📦 Your order will be dispatched after payment confirmation.\n\n🙏 Thank you for choosing Zawiya Books!`;
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${waPhone(phone)}?text=${encodeURIComponent(text)}`;
}
