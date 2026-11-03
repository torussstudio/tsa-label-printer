import { getLotDetail } from "@/lib/db";
import { handle, int } from "@/lib/http";

/** Everything about one lot: product, print jobs and raw material batches. */
export async function GET(_request: Request, ctx: RouteContext<"/api/lots/[id]">) {
  const { id } = await ctx.params;
  return handle("GET /api/lots/[id]", () => getLotDetail(int(id, "Lot id", 1, 2 ** 31 - 1)));
}
