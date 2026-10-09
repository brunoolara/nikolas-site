// Cadastro dos funcionários: só o master entra.

import type { Metadata } from "next";
import { exigir } from "@/lib/acessos/sessao";
import SemAcesso from "@/components/painel/SemAcesso";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Acessos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutAcessos({ children }: { children: React.ReactNode }) {
  const { sessao, liberado } = await exigir("master");
  return <div className="painel">{liberado ? children : <SemAcesso nome={sessao.nome} />}</div>;
}
