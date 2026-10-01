import type { GroupOrderRecord } from "./group-orders";
export function whatsappNumber(phone: string): string | null {
  if (!/^[+\d\s()-]+$/.test(phone)) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^[689]\d{7}$/.test(digits)) return `65${digits}`;
  if (digits.startsWith("65")) return /^65[689]\d{7}$/.test(digits) ? digits : null;
  if (phone.trim().startsWith("+") && /^[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}
export function quotationMessage(order: GroupOrderRecord): string | null {
  if (!order.quote || !["quoted", "confirmed"].includes(order.status)) return null;
  const zh = order.locale === "zh";
  const money = (n: number) => `S$${n.toFixed(2)}`;
  return [
    zh ? `您好 ${order.name}，这是青云间的团单报价。` : `Hello ${order.name}, here is your QING YUN JIAN group order quotation.`,
    `${zh ? "订单编号" : "Reference"}: ${order.reference}`,
    "", ...order.items.map(item => `${item.name} × ${item.quantity}`),
    `${zh ? "总杯数" : "Total cups"}: ${order.totalCups}`, "",
    `${zh ? "饮品费用" : "Drinks"}: ${money(order.quote.drinks)}`,
    `${zh ? "配送费" : "Delivery fee"}: ${money(order.quote.delivery)}`,
    `${zh ? "总金额" : "Total"}: ${money(order.quote.total)}`, "",
    `${zh ? "希望日期及时间" : "Requested date and time"}: ${order.date} ${order.time} (Singapore)`,
    order.fulfilment === "delivery" ? `${zh ? "配送地址" : "Delivery address"}: ${order.address}` : `${zh ? "自取地点" : "Collection"}: ${order.storeName}`,
    "", order.status === "confirmed" ? (zh ? "订单状态：已确认。如需更改，请联系我们。" : "Order status: confirmed. Please contact us if you need to make changes.") : (zh ? "请回复是否接受报价，我们会再确认供应及安排。本报价不是付款凭证，订单须经双方确认。" : "Please reply to accept the quotation. We will confirm availability and arrangements with you. This is not a payment receipt; the order requires confirmation.")
  ].join("\n");
}
export function quotationLinks(order: GroupOrderRecord) {
  const message = quotationMessage(order);
  if (!message) return { message: null, whatsapp: null, email: null };
  const number = whatsappNumber(order.phone);
  return { message, whatsapp: number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null, email: `mailto:${encodeURIComponent(order.email)}?subject=${encodeURIComponent(`QING YUN JIAN quotation · ${order.reference}`)}&body=${encodeURIComponent(message)}` };
}
