// Operação ao vivo: mesas abertas e pedidos de delivery.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Ao vivo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutOperacao({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("operacao");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="operacao" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
