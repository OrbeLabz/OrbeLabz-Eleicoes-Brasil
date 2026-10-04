import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "OrbeLabz - Apuração | Eleições Brasil 2026",
 description: "Apuração das eleições brasileiras no Brasil e no exterior, com dados oficiais do TSE e atualização automática.",
 metadataBase: new URL("https://orbelabz.com/"),
 alternates: {
  "canonical": "https://orbelabz.com/OrbeLabz-Eleicoes-Brasil/"
},
 openGraph: {
  "type": "website",
  "locale": "pt_BR",
  "siteName": "OrbeLabz",
  "url": "https://orbelabz.com/OrbeLabz-Eleicoes-Brasil/",
  "title": "OrbeLabz - Apuração | Eleições Brasil 2026",
  "description": "Acompanhe a apuração brasileira no Brasil e no exterior, com dados oficiais do TSE e atualização automática.",
  "images": [
    {
      "url": "https://orbelabz.com/OrbeLabz-Eleicoes-Brasil/social-apuracao-v1.jpg",
      "secureUrl": "https://orbelabz.com/OrbeLabz-Eleicoes-Brasil/social-apuracao-v1.jpg",
      "width": 1200,
      "height": 630,
      "type": "image/jpeg",
      "alt": "OrbeLabz - Apuração: painel com a logo da marca, Brasil e exterior, e a mensagem Apuração em tempo real."
    }
  ]
},
 twitter: {
  "card": "summary_large_image",
  "site": "@orbelabz",
  "title": "OrbeLabz - Apuração | Eleições Brasil 2026",
  "description": "Acompanhe a apuração brasileira no Brasil e no exterior, com dados oficiais do TSE e atualização automática.",
  "images": [
    {
      "url": "https://orbelabz.com/OrbeLabz-Eleicoes-Brasil/social-apuracao-v1.jpg",
      "alt": "OrbeLabz - Apuração: painel com a logo da marca, Brasil e exterior, e a mensagem Apuração em tempo real."
    }
  ]
},
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
