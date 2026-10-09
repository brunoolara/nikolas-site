// A porta do painel (painel.nikolasrestaurante.com.br/): o proxy reescreve a
// raiz do subdomínio para esta rota.

import type { Metadata } from "next";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Painel do Nikola's",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <div className="painel">{children}</div>;
}
