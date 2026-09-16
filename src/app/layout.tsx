import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BarraMobile from "@/components/BarraMobile";
import JsonLd from "@/components/JsonLd";
import { restaurante } from "@/data/restaurante";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(restaurante.siteUrl),
  title: {
    default: "Nikola's Restaurante | Comida mineira em Ouro Fino desde 1977",
    template: "%s | Nikola's Restaurante",
  },
  description:
    "Restaurante tradicional no centro de Ouro Fino, MG. Feijão tropeiro todo dia, pratos executivos, carnes na chapa, massas caseiras, especialidades árabes e chope gelado. Reservas e delivery pelo WhatsApp.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: restaurante.nome,
    images: [{ url: "/images/og.jpg", width: 1200, height: 630, alt: "Nikola's Restaurante, Ouro Fino" }],
  },
  robots: { index: true, follow: true, "max-image-preview": "large" },
};

export const viewport: Viewport = {
  themeColor: "#1e4b39",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${figtree.variable}`}>
      <body className="min-h-dvh flex flex-col pb-16 md:pb-0">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-chope focus:text-tinta focus:px-4 focus:py-2 focus:rounded"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Footer />
        <BarraMobile />
        <JsonLd />
      </body>
    </html>
  );
}
