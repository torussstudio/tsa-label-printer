import type { Metadata } from "next";
import { Suspense } from "react";
import { LotDetail } from "@/components/LotDetail";

export const metadata: Metadata = { title: "Lot · Lot Label Printer" };

export default function Page() {
  // The lot id comes from the URL at request time, so the page streams in after the static shell
  return <Suspense><LotDetail /></Suspense>;
}
