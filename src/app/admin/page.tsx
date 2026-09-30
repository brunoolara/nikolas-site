import type { Metadata } from "next";
import { lerCardapio } from "@/lib/menu/armazem";
import { autenticado, faltaConfigurarSenha } from "@/lib/menu/sessao";
import Editor from "./Editor";
import Entrar from "./Entrar";
import "./admin.css";

export const metadata: Metadata = {
  title: "Editar o cardápio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Admin() {
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
        <p className="mt-3 text-sm text-cafe">
          Depois rode <code className="font-mono">vercel env pull</code> para usar aqui no computador,
          e publique de novo para valer no site.
        </p>
      </div>
    );
  }

  if (!(await autenticado()))
    return (
      <div className="painel">
        <Entrar />
      </div>
    );

  const cardapio = await lerCardapio();
  return (
    <div className="painel">
      <Editor
        menu={cardapio.executivo}
        atualizadoEm={cardapio.atualizadoEm}
        atualizadoPor={cardapio.atualizadoPor}
      />
    </div>
  );
}
