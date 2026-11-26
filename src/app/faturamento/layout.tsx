// Faturamento: só o master e os gestores.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { ehGestor } from "@/lib/notificacoes/armazem";
import SemAcesso from "@/components/painel/SemAcesso";
import Moldura from "@/components/painel/Moldura";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Faturamento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutFaturamento({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  return (
    <div className="painel">
      {ehGestor(sessao) ? (
        <>
          <Moldura atual="faturamento" />
          {children}
        </>
      ) : (
        <SemAcesso nome={sessao.nome} />
      )}
    </div>
  );
}
