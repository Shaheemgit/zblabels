// Writes order stage statuses back to the maintained Google Sheet through the
// Google Sheets connector gateway. Requires a signed-in user.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isIndiaPostConsignmentNumber, statusWriteValue, type WriteStage } from "./sheet";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1_biaElVDh_qm8z6ZfRKI4BLQUaa_g7Dh-w8Cd9ef-JA";
const SHEET_GID = 1229129423;

export type WriteStageInput = "payment" | "dispatch" | "delivery";

type SheetMeta = { title: string; letters: Record<WriteStageInput, string>; trackingLetter: string | null; at: number };
let metaCache: SheetMeta | null = null;

function a1(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function quotedRange(title: string, cells: string): string {
  return `'${title.replace(/'/g, "''")}'!${cells}`;
}

async function gateway<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["GOOGLE_SHEETS_API_KEY"] ?? "",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets request failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function loadMeta(): Promise<SheetMeta> {
  if (metaCache && Date.now() - metaCache.at < 5 * 60_000) return metaCache;
  const meta = await gateway<{ sheets?: { properties?: { sheetId?: number; title?: string } }[] }>(
    `/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
  );
  const title = meta.sheets?.find((s) => s.properties?.sheetId === SHEET_GID)?.properties?.title;
  if (!title) throw new Error("Order sheet tab not found");
  const head = await gateway<{ values?: string[][] }>(
    `/spreadsheets/${SPREADSHEET_ID}/values/${quotedRange(title, "1:1")}`,
  );
  const columns = head.values?.[0] ?? [];
  const find = (...words: string[]) => {
    const i = columns.findIndex((h) => words.every((w) => h.toLowerCase().includes(w)));
    if (i < 0) throw new Error(`Sheet column not found: ${words.join(" ")}`);
    return a1(i + 1);
  };
  const trackingIndex = columns.findIndex((h) => h.toLowerCase().includes("tracking") && h.toLowerCase().includes("number"));
  const letters = {
    payment: find("payment", "status"),
    dispatch: find("dispatch", "status"),
    delivery: find("status", "deliv"), // matches the sheet's "Delivety status " header typo
  };
  metaCache = { title, letters, trackingLetter: trackingIndex < 0 ? null : a1(trackingIndex + 1), at: Date.now() };
  return metaCache;
}

export const updateSheetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ row: z.number().int().min(2), stage: z.enum(["payment", "dispatch", "delivery"]) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { title, letters } = await loadMeta();
    const cell = `${letters[data.stage]}${data.row}`;
    const value =
      data.stage === "payment" ? "Payment Received" : data.stage === "dispatch" ? "Dispatched" : "Delivered";
    await gateway(
      `/spreadsheets/${SPREADSHEET_ID}/values/${quotedRange(title, cell)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[value]] }),
      },
    );
    return { ok: true, cell, value };
  });

async function writeTrackingCells(updates: { row: number; tracking: string }[]) {
  const { title, trackingLetter } = await loadMeta();
  if (!trackingLetter) throw new Error('Google Sheet is missing a "Tracking number" column');
  const data = updates.map(({ row, tracking }) => ({
    range: quotedRange(title, `${trackingLetter}${row}`),
    values: [[tracking]],
  }));
  await gateway(
    `/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    },
  );
}

export const allocateTrackingNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    orders: z.array(z.object({ id: z.string().uuid(), sheetRow: z.number().int().min(2).optional() })).min(1).max(500),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const assigned: { id: string; tracking: string; sheetRow?: number }[] = [];
    for (const order of data.orders) {
      const { data: allocated, error } = await context.supabase.rpc("allocate_india_post_barcode", {
        p_assignment_key: order.sheetRow === undefined
          ? `order:${order.id}`
          : `sheet:${order.sheetRow}:${order.sheetRow}`,
      });
      if (error || !allocated) throw new Error(error?.message ?? "Could not allocate a tracking barcode");
      assigned.push({ id: order.id, tracking: allocated, ...(order.sheetRow === undefined ? {} : { sheetRow: order.sheetRow }) });
    }

    const updates = assigned.flatMap((item) => item.sheetRow === undefined ? [] : [{ row: item.sheetRow, tracking: item.tracking }]);
    if (updates.length > 0) await writeTrackingCells(updates);
    return assigned;
  });
