// Caixinha: rateio diário da taxa de serviço. Por enquanto só o master tem a
// área; o Bruno libera para mais alguém em Acessos quando quiser.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Caixinha",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutCaixinha({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("caixinha");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="caixinha" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
