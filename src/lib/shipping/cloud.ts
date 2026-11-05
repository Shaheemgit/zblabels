import { supabase } from "@/integrations/supabase/client";
import type { Order } from "./types";
import type { LabelBatch } from "./storage";

type OrderRow = {
  id: string;
  user_id: string;
  order_id: string;
  customer: string;
  address: string;
  pin: string;
  mobile: string;
  book: string;
  qty: number;
  amount: number;
  payment: string;
  post: string;
  tracking_number: string | null;
  source_sheet_row: number | null;
  source_sheet_key: string | null;
  created_at: string;
};

function rowToOrder(r: OrderRow): Order {
  return {
    id: r.id,
    orderId: r.order_id,
    customer: r.customer,
    address: r.address,
    pin: r.pin,
    mobile: r.mobile,
    book: r.book,
    qty: r.qty,
    amount: Number(r.amount),
    post: r.post,
    payment: r.payment === "COD" ? "COD" : "Prepaid",
    tracking: r.tracking_number ?? undefined,
    sheetRow: r.source_sheet_row ?? undefined,
    sheetKey: r.source_sheet_key ?? undefined,
  };
}

function orderToRow(o: Order, userId: string) {
  return {
    id: o.id,
    user_id: userId,
    order_id: o.orderId,
    customer: o.customer,
    address: o.address,
    pin: o.pin,
    mobile: o.mobile,
    book: o.book,
    qty: o.qty,
    amount: o.amount,
    payment: o.payment,
    post: o.post,
    tracking_number: o.tracking ?? null,
    source_sheet_row: o.sheetRow ?? null,
    source_sheet_key: o.sheetKey ?? null,
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => rowToOrder(r as OrderRow));
}

export async function insertOrder(o: Order, userId: string) {
  const { error } = await supabase.from("orders").insert(orderToRow(o, userId));
  if (error) throw error;
}

export async function updateOrder(o: Order) {
  const { error } = await supabase
    .from("orders")
    .update({
      order_id: o.orderId,
      customer: o.customer,
      address: o.address,
      pin: o.pin,
      mobile: o.mobile,
      book: o.book,
      qty: o.qty,
      amount: o.amount,
      payment: o.payment,
      post: o.post,
      tracking_number: o.tracking ?? null,
      source_sheet_row: o.sheetRow ?? null,
      source_sheet_key: o.sheetKey ?? null,
    })
    .eq("id", o.id);
  if (error) throw error;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

export async function clearOrders() {
  const { error } = await supabase
    .from("orders")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

export async function fetchBatches(): Promise<LabelBatch<Order>[]> {
  const { data, error } = await supabase
    .from("label_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    orders: (r.orders as Order[]) ?? [],
  }));
}

export async function insertBatch(b: LabelBatch<Order>, userId: string) {
  const { error } = await supabase.from("label_batches").insert({
    id: b.id,
    user_id: userId,
    name: new Date(b.createdAt).toLocaleString(),
    orders: b.orders,
    created_at: b.createdAt,
  });
  if (error) throw error;
}

export async function deleteBatch(id: string) {
  const { error } = await supabase.from("label_batches").delete().eq("id", id);
  if (error) throw error;
}
