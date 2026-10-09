// Entrada única: sem login, pede usuário e senha; com login, mostra só as
// áreas que a pessoa pode abrir.

import Link from "next/link";
import Entrar from "@/components/painel/Entrar";
import Sair from "@/components/painel/Sair";
import { faltaConfigurarSenha, sessaoAtual } from "@/lib/acessos/sessao";

const AREAS = [
  {
    chave: "cardapio",
    href: "/alterar-cardapio",
    nome: "Alterar cardápio",
    descricao: "Menu executivo, menu do salão e especiais de domingo: editar e imprimir.",
  },
  {
    chave: "posts",
    href: "/posts",
    nome: "Posts do status",
    descricao: "Os posts do dia para compartilhar no status do WhatsApp.",
  },
] as const;

export default async function Painel() {
  if (faltaConfigurarSenha()) {
    return (
      <div className="mx-auto mt-24 max-w-lg px-6">
        <h1 className="font-display text-2xl">Falta configurar a senha</h1>
        <p className="mt-3 text-cafe">
          O painel só abre depois que a variável <code className="font-mono">SENHA_PAINEL</code> (a senha do
          master) existir no ambiente da Vercel.
        </p>
      </div>
    );
  }

  const sessao = await sessaoAtual();
  if (!sessao) return <Entrar area="qualquer" titulo="Painel do Nikola's" subtitulo="Entre com seu usuário e senha." />;

  const liberadas = AREAS.filter((a) => sessao.areas.includes(a.chave));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-linha pb-4">
        <div>
          <h1 className="font-display text-3xl">Painel do Nikola&apos;s</h1>
          <p className="mt-1 text-sm text-cafe">Olá, {sessao.nome}.</p>
        </div>
        <Sair />
      </header>

      <div className="mt-8 grid gap-3">
        {liberadas.map((a) => (
          <Link key={a.href} href={a.href} className="block rounded border border-linha p-5 hover:border-verde">
            <h2 className="font-display text-2xl">{a.nome}</h2>
            <p className="mt-1 text-sm text-cafe">{a.descricao}</p>
          </Link>
        ))}
        {sessao.master ? (
          <Link href="/acessos" className="block rounded border border-linha p-5 hover:border-verde">
            <h2 className="font-display text-2xl">Acessos</h2>
            <p className="mt-1 text-sm text-cafe">Cadastro dos funcionários, senhas e o que cada um acessa.</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
