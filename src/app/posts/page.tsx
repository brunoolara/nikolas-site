// O que a equipe abre, em duas abas para a página não virar um rolo:
// - Agenda: um dia por vez (hoje, se não escolher outro), navegável por setas
//   e pela faixa dos próximos 14 dias, com aviso do que ficou para trás.
// - Banco de posts: os que podem sair em qualquer dia, com filtro por tipo.
// Os posts aparecem em grade de miniaturas; tocar abre em tela cheia. Aba e
// dia ficam no endereço (?aba=banco, ?dia=AAAA-MM-DD), dá para mandar o link.

import Link from "next/link";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { lerPosts } from "@/lib/posts/armazem";
import { DATA, hoje, rotuloCurto, rotuloData, somarDias } from "@/lib/posts/tipos";
import Sair from "@/components/painel/Sair";
import GradePosts from "./GradePosts";

export default async function Posts({ searchParams }: PageProps<"/posts">) {
  const [sessao, posts, busca] = await Promise.all([sessaoAtual(), lerPosts(), searchParams]);
  const master = Boolean(sessao?.master);
  const dia = hoje();
  const pedido = typeof busca.dia === "string" && DATA.test(busca.dia) ? busca.dia : dia;
  const ehHoje = pedido === dia;
  const aba = busca.aba === "banco" ? "banco" : "agenda";

  const agenda = posts.filter((p) => p.data);
  const atrasados = agenda.filter((p) => p.data! < dia && !p.publicacoes.length);
  const doDia = agenda.filter((p) => p.data === pedido);
  const banco = posts.filter((p) => !p.data).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const quantos = new Map<string, number>();
  for (const p of agenda) quantos.set(p.data!, (quantos.get(p.data!) ?? 0) + 1);
  const faixa = Array.from({ length: 14 }, (_, i) => somarDias(dia, i));
  const linkDia = (d: string) => (d === dia ? "/posts" : `/posts?dia=${d}`);


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

      <div className="mt-6 grid grid-cols-2 rounded border border-linha p-1" role="tablist">
        {(
          [
            ["agenda", "Agenda", "/posts"],
            ["banco", `Banco de posts (${banco.length})`, "/posts?aba=banco"],
          ] as const
        ).map(([chave, nome, href]) => (
          <Link
            key={chave}
            href={href}
            role="tab"
            aria-selected={aba === chave}
            className={`rounded px-3 py-2 text-center text-sm font-semibold ${
              aba === chave ? "bg-verde text-papel" : "text-cafe hover:bg-creme"
            }`}
          >
            {nome}
          </Link>
        ))}
      </div>

      {aba === "banco" ? (
        <section className="mt-6">
          <p className="text-sm text-cafe">Podem sair em qualquer dia, quantas vezes precisar.</p>
          <GradePosts posts={banco} master={master} porTipo vazio="O banco está vazio." />
        </section>
      ) : (
        <>
          {ehHoje && atrasados.length ? (
            <details className="mt-6 rounded border border-red-300 bg-red-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-red-800">
                {atrasados.length} {atrasados.length > 1 ? "posts ficaram" : "post ficou"} para trás
              </summary>
              <p className="mt-1 text-xs text-red-800">Eram de dias anteriores e ninguém marcou como publicado.</p>
              <GradePosts posts={atrasados} master={master} vazio="" />
            </details>
          ) : null}

          <nav className="mt-6" aria-label="Escolher o dia">
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

          <GradePosts
            posts={doDia}
            master={master}
            vazio="Nada agendado para este dia. Veja a aba Banco de posts."
          />
        </>
      )}
    </div>
  );
}
