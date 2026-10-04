import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "OrbeLabz - Apuração | Eleições Brasil 2026",
 description: "Apuração das eleições brasileiras no Brasil e no exterior, com dados oficiais do TSE e atualização automática.",
 icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="pt-BR" className="dark"><body>{children}</body></html>;
}
