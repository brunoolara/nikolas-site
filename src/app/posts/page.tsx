// A lista que a equipe abre: o que sai hoje, o que ficou para trás, os
// próximos dias e o banco de posts para usar a qualquer momento.

import Link from "next/link";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { lerPosts } from "@/lib/posts/armazem";
import { hoje, rotuloData, somarDias, type Post } from "@/lib/posts/tipos";
import Sair from "@/components/painel/Sair";
import CartaoPost from "./CartaoPost";

export default async function Posts() {
  const [sessao, posts] = await Promise.all([sessaoAtual(), lerPosts()]);
  const master = Boolean(sessao?.master);
  const dia = hoje();

  const agenda = posts.filter((p) => p.data).sort((a, b) => a.data!.localeCompare(b.data!));
  const atrasados = agenda.filter((p) => p.data! < dia && !p.publicacoes.length);
  const deHoje = agenda.filter((p) => p.data === dia);
  const proximos = agenda.filter((p) => p.data! > dia);
  const banco = posts.filter((p) => !p.data).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const semanaPassada = somarDias(dia, -7);
  const jaSaiu = agenda.filter((p) => p.data! < dia && p.data! >= semanaPassada && p.publicacoes.length).reverse();

  const porDia = new Map<string, Post[]>();
  for (const p of proximos) porDia.set(p.data!, [...(porDia.get(p.data!) ?? []), p]);

  const cartao = (p: Post) => <CartaoPost key={p.id} post={p} master={master} />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-4">
        <div>
          <Link href="/" className="text-sm text-cafe underline">
            ← Painel
          </Link>
          <h1 className="font-display text-3xl">Posts do status</h1>
          <p className="mt-1 text-sm text-cafe">
            <span className="capitalize">{rotuloData(dia)}</span> · {sessao?.nome}
          </p>
        </div>
        <div className="flex gap-2">
          {master ? (
            <>
              <Link href="/acessos" className="rounded border border-linha px-3 py-2 text-sm text-cafe hover:bg-creme">
                Acessos
              </Link>
              <Link
                href="/alterar-cardapio"
                className="rounded border border-linha px-3 py-2 text-sm text-cafe hover:bg-creme"
              >
                Cardápio
              </Link>
              <Link
                href="/posts/novo"
                className="rounded bg-verde px-3 py-2 text-sm font-semibold text-papel hover:bg-verde-escuro"
              >
                Novo post
              </Link>
            </>
          ) : null}
          <Sair />
        </div>
      </header>

      {atrasados.length ? (
        <Bloco titulo="Ficaram para trás" nota="Eram de dias anteriores e ninguém marcou como publicado.">
          {atrasados.map(cartao)}
        </Bloco>
      ) : null}

      <Bloco titulo="Hoje">
        {deHoje.length ? deHoje.map(cartao) : <Vazio>Nada agendado para hoje. Veja o banco de posts lá embaixo.</Vazio>}
      </Bloco>

      {porDia.size ? (
        <details className="mt-8">
          <summary className="cursor-pointer font-display text-2xl">Próximos dias ({proximos.length})</summary>
          {[...porDia].map(([d, lista]) => (
            <Bloco key={d} titulo={rotuloData(d)}>
              {lista.map(cartao)}
            </Bloco>
          ))}
        </details>
      ) : null}

      <Bloco titulo="Banco de posts" nota="Podem sair em qualquer dia, quantas vezes precisar.">
        {banco.length ? banco.map(cartao) : <Vazio>O banco está vazio.</Vazio>}
      </Bloco>

      {jaSaiu.length ? (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-cafe">
            Publicados nos últimos 7 dias ({jaSaiu.length})
          </summary>
          <div className="mt-3 grid gap-3">{jaSaiu.map(cartao)}</div>
        </details>
      ) : null}
    </div>
  );
}

function Bloco({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl first-letter:uppercase">{titulo}</h2>
      {nota ? <p className="text-sm text-cafe">{nota}</p> : null}
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-linha p-4 text-sm text-cafe">{children}</p>;
}
