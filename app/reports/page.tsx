import type { Metadata } from "next";
import { Reports } from "@/components/Reports";

export const metadata: Metadata = { title: "Reports · Lot Label Printer" };

export default function Page() {
  return <Reports />;
}
