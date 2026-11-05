export type TrackingSyncStatus = "synced" | "failed" | "not_applicable";

export function canRetryTrackingWrite(order: {
  tracking?: string | undefined;
  sheetRow?: number | undefined;
  trackingSyncStatus?: TrackingSyncStatus | undefined;
}): boolean {
  return Boolean(order.tracking && order.sheetRow !== undefined && order.trackingSyncStatus === "failed");
}