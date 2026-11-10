// Guarda do cardápio: sem login volta para a porta do painel; quem entrou sem
// acesso ao cardápio vê o aviso.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Editar o cardápio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutCardapio({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("cardapio");
  return (
    <div className="painel">
      {liberado ? (
        <>
          <Moldura atual="cardapio" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
