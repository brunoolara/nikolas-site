// Cadastro dos funcionários: só o master entra.

import type { Metadata } from "next";
import { sessaoAtual } from "@/lib/acessos/sessao";
import Entrar from "@/components/painel/Entrar";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Acessos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutAcessos({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao?.master) {
    return (
      <div className="painel">
        <Entrar
          area="master"
          titulo="Acessos"
          subtitulo="Só o master entra aqui."
          logadoComo={sessao?.nome}
        />
      </div>
    );
  }
  return <div className="painel">{children}</div>;
}
