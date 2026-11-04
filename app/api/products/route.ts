import { connection } from "next/server";
import { listProducts, saveProductWithLabel } from "@/lib/db";
import { handle, parseProduct, parseProductLabel, readJson } from "@/lib/http";

export function GET() {
  return handle("GET /api/products", async () => {
    await connection();
    return listProducts();
  });
}

export function POST(request: Request) {
  return handle("POST /api/products", async () => {
    await connection();
    const body = await readJson(request);
    const product = parseProduct(asRecord(body.product));
    const label = parseProductLabel(asRecord(body.label), product.name);
    return saveProductWithLabel(null, product, label);
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
