// Minha caixinha: cada funcionário vê só a própria parte (ver lib/caixinha/minha.ts).

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Minha caixinha",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutMinhaCaixinha({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("minha-caixinha");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="minha-caixinha" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
