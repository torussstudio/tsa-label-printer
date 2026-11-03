import { finishPrint } from "@/lib/db";
import { HttpError, handle, int, readJson } from "@/lib/http";

/** { status: "printed" | "failed" } once the printer is done. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/prints/[id]">) {
  const { id: rawId } = await ctx.params;
  const b = await readJson(request);
  return handle("PATCH /api/prints/[id]", async () => {
    const id = int(rawId, "Print id", 1, 2 ** 31 - 1);
    if (b.status !== "printed" && b.status !== "failed") throw new HttpError(400, "Bad status");
    return finishPrint(id, b.status);
  });
}
