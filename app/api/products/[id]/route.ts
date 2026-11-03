import { saveProduct } from "@/lib/db";
import { handle, int, parseProduct, readJson } from "@/lib/http";

export async function PUT(request: Request, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  const body = await readJson(request);
  return handle("PUT /api/products/[id]", async () => saveProduct(int(id, "Product id", 1, 2 ** 31 - 1), parseProduct(body)));
}
