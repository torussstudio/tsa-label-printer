// Thin wrapper around NiimBlueLib (community implementation of the NIIMBOT protocol).
// The library touches browser-only APIs, so it is imported lazily on the client.
import type { NiimbotBluetoothClient } from "@mmote/niimbluelib";

export type PrinterClient = NiimbotBluetoothClient;

const loadLib = () => import("@mmote/niimbluelib");

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export interface ConnectHandlers {
  onDisconnect: () => void;
  onProgress: (percent: number) => void;
}

/** Opens the browser's Bluetooth picker and connects. Must be called from a click. */
export async function connectPrinter(h: ConnectHandlers): Promise<{ client: PrinterClient; model?: string }> {
  const lib = await loadLib();
  const client = new lib.NiimbotBluetoothClient();
  client.on("disconnect", () => h.onDisconnect());
  client.on("printprogress", (e) => {
    const pct = ((e.page - 1 + e.pagePrintProgress / 100) / Math.max(1, e.pagesTotal)) * 100;
    h.onProgress(Math.max(0, Math.min(100, pct)));
  });
  await client.connect();
  const meta = client.getModelMetadata();
  return { client, model: meta?.model };
}

/** Prints `canvas` `quantity` times. The image is sent once; the printer repeats it. */
export async function printCanvas(
  client: PrinterClient,
  canvas: HTMLCanvasElement,
  quantity: number,
  density: number,
  paper: "transparent" | "gaps" = "gaps",
): Promise<void> {
  const lib = await loadLib();
  const meta = client.getModelMetadata();
  const encoded = lib.ImageEncoder.encodeCanvas(
    canvas,
    lib.PageColorType.SingleColor,
    meta?.printDirection ?? "top",
  );
  const task = client.protocol.newPrintTask(client.getPrintTaskType() ?? "B1", {
    totalPages: quantity,
    density,
    labelType: paper === "transparent" ? lib.LabelType.Transparent : lib.LabelType.WithGaps,
  });
  try {
    await task.printInit();
    await task.printPage(encoded, quantity);
    await task.waitForFinished();
  } finally {
    try { await client.protocol.printEnd(); } catch { /* ignore */ }
  }
}
