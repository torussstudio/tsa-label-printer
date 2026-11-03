import { deleteMaterial } from "@/lib/db";
import { handle, int } from "@/lib/http";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/lots/[id]/materials/[materialId]">) {
  const { id, materialId } = await ctx.params;
  return handle("DELETE /api/lots/[id]/materials/[materialId]", async () =>
    deleteMaterial(int(id, "Lot id", 1, 2 ** 31 - 1), int(materialId, "Material id", 1, 2 ** 31 - 1)));
}
