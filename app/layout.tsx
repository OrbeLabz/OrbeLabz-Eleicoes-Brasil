import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "OrbeLabz - Apuração | Eleições Brasil 2026",
 description: "Apuração das eleições brasileiras no Brasil e no exterior, com dados oficiais do TSE e atualização automática.",
 icons: {
  icon: [
   { url: "/orbelabz-favicon.ico?v=20261004", sizes: "16x16 32x32 48x48" },
   { url: "/orbelabz-favicon.svg?v=20261004", type: "image/svg+xml", sizes: "any" },
  ],
  shortcut: "/orbelabz-favicon.ico?v=20261004",
  apple: { url: "/orbelabz-apple-touch-icon.png?v=20261004", sizes: "180x180" },
 },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="pt-BR" className="dark"><body>{children}</body></html>;
}
