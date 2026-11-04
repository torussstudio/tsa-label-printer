// import { finishPrint } from "@/lib/db";
// import { HttpError, handle, int, readJson } from "@/lib/http";

// /** { status: "printed" | "failed" } once the printer is done. */
// export async function PATCH(request: Request, ctx: RouteContext<"/api/prints/[id]">) {
//   const { id: rawId } = await ctx.params;
//   const b = await readJson(request);
//   return handle("PATCH /api/prints/[id]", async () => {
//     const id = int(rawId, "Print id", 1, 2 ** 31 - 1);
//     if (b.status !== "printed" && b.status !== "failed") throw new HttpError(400, "Bad status");
//     return finishPrint(id, b.status);
//   });
// }


import { connection } from "next/server";
import { finishPrint } from "@/lib/db";
import { handle, HttpError, int, readJson } from "@/lib/http";

export function PATCH(request: Request, ctx: RouteContext<"/api/prints/[id]">) {
  return handle("PATCH /api/prints/[id]", async () => {
    await connection();
    const { id: rawId } = await ctx.params;
    const body = await readJson(request);
    if (body.status !== "printed" && body.status !== "failed") throw new HttpError(400, "Bad status");
    return finishPrint(int(rawId, "Print id", 1, 2 ** 31 - 1), body.status);
  });
}
