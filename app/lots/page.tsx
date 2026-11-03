import type { Metadata } from "next";
import { LotSearch } from "@/components/LotSearch";

export const metadata: Metadata = { title: "Lots · Lot Label Printer" };

export default function Page() {
  return <LotSearch />;
}
