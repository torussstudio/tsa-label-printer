import type { NextRequest } from "next/server";
import { listPrints, startPrint } from "@/lib/db";
import { MAX_QTY, PRESETS } from "@/lib/label";
import { HttpError, day, handle, int, readJson, text } from "@/lib/http";

/** ?from=&to=[&by=lot|printed][&product=ID] → print jobs, newest first. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return handle("GET /api/prints", async () => {
    const from = day(q.get("from"), "from date");
    const to = day(q.get("to"), "to date");
    if (from > to) throw new HttpError(400, "Pick a valid date range");
    const product = q.get("product");
    return listPrints({
      from, to,
      by: q.get("by") === "printed" ? "printed" : "lot",
      productId: product ? int(product, "Product", 1, 2 ** 31 - 1) : null,
    });
  });
}

/** Starts a print job: records it as pending under the product's lot for the day and returns that lot. */
export async function POST(request: Request) {
  const b = await readJson(request);
  return handle("POST /api/prints", async () => {
    if (!PRESETS.some((p) => p.id === b.preset)) throw new HttpError(400, "Unknown label type");
    return startPrint({
      productId: int(b.productId, "Product", 1, 2 ** 31 - 1),
      preset: b.preset as string,
      quantity: int(b.quantity, "Quantity", 1, MAX_QTY),
      lotPrefix: text(b.lotPrefix, 12),
      lotWithYear: b.lotWithYear !== false,
      date: b.date ? day(b.date) : null,
      note: text(b.note, 200),
    });
  });
}
