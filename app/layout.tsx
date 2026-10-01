import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "TipStream — Pay continuously on BOT Chain",
    template: "%s · TipStream",
  },
  description: "Create live, second-by-second BOT payment streams on BOT Chain mainnet.",
  openGraph: {
    title: "TipStream",
    description: "BOT payments that settle every second.",
    images: ["/tipstream-logo.png"],
  },
  twitter: {
    card: "summary",
    title: "TipStream",
    description: "BOT payments that settle every second.",
    images: ["/tipstream-logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
