// import { getLotDetail } from "@/lib/db";
// import { handle, int } from "@/lib/http";

// /** Everything about one lot: product, print jobs and raw material batches. */
// export async function GET(_request: Request, ctx: RouteContext<"/api/lots/[id]">) {
//   const { id } = await ctx.params;
//   return handle("GET /api/lots/[id]", () => getLotDetail(int(id, "Lot id", 1, 2 ** 31 - 1)));
// }


import { connection } from "next/server";
// app/api/lots/[id]/route.ts
import { getLotDetail } from "@/lib/db";
import { handle, int } from "@/lib/http";


/** GET /api/lots/:id → lot, its print jobs and its raw materials. */
export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle("GET /api/lots/[id]", async () => {
    await connection(); // never prerender: reads the database
    const { id } = await params;
    return getLotDetail(int(id, "Lot id", 1, 2147483647));
  });
}