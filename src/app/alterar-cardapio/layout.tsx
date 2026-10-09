// Porta do cardápio: usuário e senha conferidos uma vez aqui, valem para todas as telas.

import type { Metadata } from "next";
import { faltaConfigurarSenha, sessaoAtual } from "@/lib/acessos/sessao";
import Entrar from "@/components/painel/Entrar";
import "@/components/painel/painel.css";

export const metadata: Metadata = {
  title: "Editar o cardápio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (faltaConfigurarSenha()) {
    return (
      <div className="painel mx-auto mt-24 max-w-lg px-6">
        <h1 className="font-display text-2xl">Falta configurar a senha</h1>
        <p className="mt-3 text-cafe">
          O painel só abre depois que a variável <code className="font-mono">SENHA_PAINEL</code> (a senha do master) existir
          no ambiente. Para criar, rode no terminal do projeto:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-creme p-3 font-mono text-sm">
          vercel env add SENHA_PAINEL
        </pre>
      </div>
    );
  }

  const sessao = await sessaoAtual();
  if (!sessao?.areas.includes("cardapio")) {
    return (
      <div className="painel">
        <Entrar
          area="cardapio"
          titulo="Cardápio do Nikola's"
          subtitulo="Entre para editar e imprimir."
          logadoComo={sessao?.nome}
        />
      </div>
    );
  }

  return <div className="painel">{children}</div>;
}
