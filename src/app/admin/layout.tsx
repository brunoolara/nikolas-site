// Porta do painel: a senha é conferida uma vez aqui, e vale para todas as telas.

import type { Metadata } from "next";
import { autenticado, faltaConfigurarSenha } from "@/lib/menu/sessao";
import Entrar from "./Entrar";
import "./admin.css";

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
          O painel só abre depois que a variável <code className="font-mono">SENHA_PAINEL</code> existir
          no ambiente. Para criar, rode no terminal do projeto:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-creme p-3 font-mono text-sm">
          vercel env add SENHA_PAINEL
        </pre>
      </div>
    );
  }

  if (!(await autenticado())) {
    return (
      <div className="painel">
        <Entrar />
      </div>
    );
  }

  return <div className="painel">{children}</div>;
}
