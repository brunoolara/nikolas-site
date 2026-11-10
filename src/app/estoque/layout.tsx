// Contagem de estoque: quem tem a área "estoque" conta; o master organiza.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Contagem de estoque",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutEstoque({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("estoque");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="estoque" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
