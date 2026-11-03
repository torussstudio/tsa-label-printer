import type { Metadata } from "next";
import { Products } from "@/components/Products";

export const metadata: Metadata = { title: "Products · Lot Label Printer" };

export default function Page() {
  return <Products />;
}
