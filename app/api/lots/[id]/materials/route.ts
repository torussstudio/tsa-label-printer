import { addMaterial } from "@/lib/db";
import { HttpError, handle, int, readJson, text } from "@/lib/http";

/** Records a raw material batch used in this lot. */
export async function POST(request: Request, ctx: RouteContext<"/api/lots/[id]/materials">) {
  const { id } = await ctx.params;
  const b = await readJson(request);
  return handle("POST /api/lots/[id]/materials", async () => {
    const material = text(b.material, 80);
    const batch = text(b.batch, 60);
    if (!material || !batch) throw new HttpError(400, "Material and batch number are needed");
    return addMaterial(int(id, "Lot id", 1, 2 ** 31 - 1), { material, batch, supplier: text(b.supplier, 80) || null });
  });
}
