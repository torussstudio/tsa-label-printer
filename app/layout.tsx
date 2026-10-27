import type { Metadata, Viewport } from "next";
// Label fonts, bundled locally so the canvas can draw with them offline
// values / captions
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/share-tech/400.css";
import "@fontsource/jetbrains-mono/800.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/share-tech-mono/400.css";
import "@fontsource/ibm-plex-mono/700.css";
// handwriting (date)
import "@fontsource/caveat/500.css";
import "@fontsource/shadows-into-light/400.css";
import "@fontsource/reenie-beanie/400.css";
import "@fontsource/nanum-pen-script/400.css";
import "@fontsource/homemade-apple/400.css";
// slab / typewriter (left cell text)
import "@fontsource/rokkitt/500.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/special-elite/400.css";
import "@fontsource/zilla-slab/500.css";
import "@fontsource/arvo/400.css";
// bold captions
import "@fontsource/space-grotesk/700.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/saira-semi-condensed/700.css";
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
      <head>
        {/* Custom label fonts (Montech, Last Signature, Typewriter Serial), served straight from /public */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}