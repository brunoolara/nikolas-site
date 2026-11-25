// Contas a pagar: o que vence, o código para pagar e o "Paguei".
// Só quem tem a área "contas" (o master tem todas).

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Contas a pagar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutContas({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("contas");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="contas" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
