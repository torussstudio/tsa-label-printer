import type { NextRequest } from "next/server";
import { searchLots } from "@/lib/db";
import { handle, text } from "@/lib/http";

/** ?q=… → lots whose code, printed lot or a raw material batch contains it (latest lots if empty). */
export async function GET(request: NextRequest) {
  const q = text(request.nextUrl.searchParams.get("q"), 60);
  return handle("GET /api/lots", () => searchLots(q));
}
