import { isIndiaPostConsignmentNumber } from "./sheet";
import type { Order } from "./types";

export type PrePrintSyncStatus = "synced" | "failed" | "needs_review" | "not_applicable";

export type PrePrintCheck = {
  order: Order;
  missingRecipientDetails: string[];
  validTrackingNumber: boolean;
  syncStatus: PrePrintSyncStatus;
};

export function buildPrePrintChecklist(orders: Order[]): PrePrintCheck[] {
  return orders.map((order) => {
    const missingRecipientDetails = [
      ["Customer name", order.customer],
      ["Address", order.address],
      ["PIN / postal code", order.pin],
      ["Contact number", order.mobile],
    ].flatMap(([label, value]) => (typeof value === "string" && value.trim() ? [] : [label as string]));

    const syncStatus: PrePrintSyncStatus = order.sheetRow === undefined
      ? "not_applicable"
      : order.trackingSyncStatus === "synced"
        ? "synced"
        : order.trackingSyncStatus === "failed"
          ? "failed"
          : "needs_review";

    return {
      order,
      missingRecipientDetails,
      validTrackingNumber: Boolean(order.tracking && isIndiaPostConsignmentNumber(order.tracking)),
      syncStatus,
    };
  });
}

export function checklistHasWarnings(checks: PrePrintCheck[]): boolean {
  return checks.some((check) =>
    check.missingRecipientDetails.length > 0 || !check.validTrackingNumber ||
    check.syncStatus === "failed" || check.syncStatus === "needs_review"
  );
}