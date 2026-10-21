import type { Metadata, Viewport } from "next";
// Label fonts, bundled locally so the canvas can draw with them offline
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/share-tech/400.css";
import "@fontsource/jetbrains-mono/800.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/share-tech-mono/400.css";
import "@fontsource/ibm-plex-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lot Label Printer",
  description: "Print lot/date labels on a NIIMBOT B1 over Web Bluetooth",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
