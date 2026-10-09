// A lista que a equipe abre: um dia por vez (hoje, se não escolher outro),
// navegável por setas e pela faixa dos próximos 14 dias, o que ficou para
// trás e o banco de posts para usar a qualquer momento. O dia escolhido fica
// no endereço (?dia=AAAA-MM-DD), então dá para mandar o link de um dia.

import Link from "next/link";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { lerPosts } from "@/lib/posts/armazem";
import { DATA, hoje, rotuloCurto, rotuloData, somarDias, type Post } from "@/lib/posts/tipos";
import Sair from "@/components/painel/Sair";
import CartaoPost from "./CartaoPost";

export default async function Posts({ searchParams }: PageProps<"/posts">) {
  const [sessao, posts, busca] = await Promise.all([sessaoAtual(), lerPosts(), searchParams]);
  const master = Boolean(sessao?.master);
  const dia = hoje();
  const pedido = typeof busca.dia === "string" && DATA.test(busca.dia) ? busca.dia : dia;
  const ehHoje = pedido === dia;

  const agenda = posts.filter((p) => p.data);
  const atrasados = agenda.filter((p) => p.data! < dia && !p.publicacoes.length);
  const doDia = agenda.filter((p) => p.data === pedido);
  const banco = posts.filter((p) => !p.data).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const quantos = new Map<string, number>();
  for (const p of agenda) quantos.set(p.data!, (quantos.get(p.data!) ?? 0) + 1);
  const faixa = Array.from({ length: 14 }, (_, i) => somarDias(dia, i));
  const linkDia = (d: string) => (d === dia ? "/posts" : `/posts?dia=${d}`);

  const cartao = (p: Post) => <CartaoPost key={p.id} post={p} master={master} />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-4">
        <div>
          <Link href="/" className="text-sm text-cafe underline">
            ← Painel
          </Link>
          <h1 className="font-display text-3xl">Posts do status</h1>
          <p className="mt-1 text-sm text-cafe">{sessao?.nome}</p>
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

      {ehHoje && atrasados.length ? (
        <Bloco titulo="Ficaram para trás" nota="Eram de dias anteriores e ninguém marcou como publicado.">
          {atrasados.map(cartao)}
        </Bloco>
      ) : null}

      <nav className="mt-8" aria-label="Escolher o dia">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={linkDia(somarDias(pedido, -1))}
            className="rounded border border-linha px-3 py-2 text-lg leading-none text-cafe hover:bg-creme"
            aria-label="Dia anterior"
          >
            ‹
          </Link>
          <div className="text-center">
            <h2 className="font-display text-2xl first-letter:uppercase">{ehHoje ? "Hoje" : rotuloData(pedido)}</h2>
            {ehHoje ? (
              <p className="text-sm capitalize text-cafe">{rotuloData(dia)}</p>
            ) : (
              <Link href="/posts" className="text-sm text-verde underline">
                Voltar para hoje
              </Link>
            )}
          </div>
          <Link
            href={linkDia(somarDias(pedido, 1))}
            className="rounded border border-linha px-3 py-2 text-lg leading-none text-cafe hover:bg-creme"
            aria-label="Próximo dia"
          >
            ›
          </Link>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {faixa.map((d) => {
            const { semana, dia: num } = rotuloCurto(d);
            const n = quantos.get(d) ?? 0;
            const atual = d === pedido;
            return (
              <Link
                key={d}
                href={linkDia(d)}
                aria-current={atual ? "date" : undefined}
                className={`flex min-w-12 shrink-0 flex-col items-center rounded border px-2 py-1.5 text-xs ${
                  atual ? "border-verde bg-verde text-papel" : "border-linha text-cafe hover:bg-creme"
                }`}
              >
                <span>{semana}</span>
                <span className="text-base font-semibold">{num}</span>
                <span className={n ? "" : "opacity-50"}>{n ? `${n} post${n > 1 ? "s" : ""}` : "—"}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-4 grid gap-3">
        {doDia.length ? (
          doDia.map(cartao)
        ) : (
          <Vazio>Nada agendado para este dia. O banco de posts está logo abaixo.</Vazio>
        )}
      </div>

      <Bloco titulo="Banco de posts" nota="Podem sair em qualquer dia, quantas vezes precisar.">
        {banco.length ? banco.map(cartao) : <Vazio>O banco está vazio.</Vazio>}
      </Bloco>
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
