import { connection } from "next/server";
import { listProducts, saveProduct } from "@/lib/db";
import { handle, parseProduct, readJson } from "@/lib/http";

export async function GET() {
  await connection(); // never prerender: products change at runtime
  return handle("GET /api/products", () => listProducts());
}

export async function POST(request: Request) {
  const body = await readJson(request);
  return handle("POST /api/products", async () => saveProduct(null, parseProduct(body)));
}
