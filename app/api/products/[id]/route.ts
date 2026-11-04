import { connection } from "next/server";
import { deleteArchivedProduct, saveProduct, saveProductWithLabel } from "@/lib/db";
import { handle, int, parseProduct, parseProductLabel, readJson } from "@/lib/http";

export function PUT(request: Request, ctx: RouteContext<"/api/products/[id]">) {
  return handle("PUT /api/products/[id]", async () => {
    await connection();
    const { id } = await ctx.params;
    const body = await readJson(request);
    const productId = int(id, "Product id", 1, 2 ** 31 - 1);
    if (!body.product || !body.label) return saveProduct(productId, parseProduct(body));
    const product = parseProduct(asRecord(body.product));
    const label = parseProductLabel(asRecord(body.label), product.name);
    return saveProductWithLabel(productId, product, label);
  });
}

export function DELETE(_request: Request, ctx: RouteContext<"/api/products/[id]">) {
  return handle("DELETE /api/products/[id]", async () => {
    await connection();
    const { id } = await ctx.params;
    return deleteArchivedProduct(int(id, "Product id", 1, 2 ** 31 - 1));
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
