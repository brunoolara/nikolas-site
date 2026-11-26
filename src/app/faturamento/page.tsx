// Faturamento para os gestores (pedido do Bruno em 26/11/2026, no espírito do
// relatório mensal da Takeat): o dia, a semana ou o mês, nos dois turnos ou em
// um só, comparado com o mesmo trecho do período anterior. Lê as comandas
// guardadas pelo painel (lib/takeat/comandas.ts); só a fatia de hoje vai à Takeat.
//
// Endereço: ?ver=dia|semana|mes&data=AAAA-MM-DD&turno=almoco|jantar

import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecalho from "@/components/painel/Cabecalho";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { ehGestor } from "@/lib/notificacoes/armazem";
import { hoje } from "@/lib/posts/tipos";
import { semanaDe, somarDias } from "@/lib/estoque/categorias";
import { comandasDoPeriodo } from "@/lib/takeat/comandas";
import { mensagemDe } from "@/lib/takeat/cliente";
import { reais } from "@/lib/caixinha/tipos";
import {
  CANAIS,
  ROTULO_CANAL,
  ROTULO_PAGAMENTO,
  resumir,
  variacao,
  type Canal,
  type Resumo,
  type Turno,
} from "@/lib/faturamento/calculo";

export const maxDuration = 120;

type Ver = "dia" | "semana" | "mes";
type Periodo = {
  ver: Ver;
  ini: string;
  fim: string;
  antIni: string;
  antFim: string;
  rotulo: string;
  comparado: string;
  anterior: string;
  proximo: string | null;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const semana = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
const mesNome = (d: string, ano = true) =>
  new Date(`${d.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: ano ? "long" : "short",
    ...(ano ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
const fimDoMes = (d: string) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).toISOString().slice(0, 10);
const somarMeses = (d: string, n: number) =>
  new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 10);
const menor = (a: string, b: string) => (a < b ? a : b);
const dias = (ini: string, fim: string) => {
  const lista: string[] = [];
  for (let d = ini; d <= fim; d = somarDias(d, 1)) lista.push(d);
  return lista;
};

function periodoDe(ver: Ver, data: string, dia: string): Periodo {
  if (ver === "dia") {
    const ant = somarDias(data, -7);
    return {
      ver,
      ini: data,
      fim: data,
      antIni: ant,
      antFim: ant,
      rotulo: `${semana(data)}, ${ddmm(data)}`,
      comparado: `${semana(ant)}, ${ddmm(ant)}`,
      anterior: somarDias(data, -1),
      proximo: data < dia ? somarDias(data, 1) : null,
    };
  }
  if (ver === "semana") {
    const ini = semanaDe(data);
    const fim = menor(somarDias(ini, 6), dia);
    const n = dias(ini, fim).length;
    const antIni = somarDias(ini, -7);
    return {
      ver,
      ini,
      fim,
      antIni,
      antFim: somarDias(antIni, n - 1),
      rotulo: `Semana ${ddmm(ini)} a ${ddmm(somarDias(ini, 6))}`,
      comparado: `${ddmm(antIni)} a ${ddmm(somarDias(antIni, n - 1))}`,
      anterior: somarDias(ini, -7),
      proximo: somarDias(ini, 7) <= dia ? somarDias(ini, 7) : null,
    };
  }
  const ini = `${data.slice(0, 7)}-01`;
  const fim = menor(fimDoMes(ini), dia);
  const n = dias(ini, fim).length;
  const antIni = somarMeses(ini, -1);
  const antFim = menor(somarDias(antIni, n - 1), fimDoMes(antIni));
  return {
    ver,
    ini,
    fim,
    antIni,
    antFim,
    rotulo: mesNome(ini),
    comparado: `${Number(antIni.slice(8))}–${Number(antFim.slice(8))} ${mesNome(antIni, false).replace(".", "")}`,
    anterior: antIni,
    proximo: somarMeses(ini, 1) <= dia ? somarMeses(ini, 1) : null,
  };
}

const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function Variacao({ atual, antes, claro }: { atual: number; antes: number; claro?: boolean }) {
  const v = variacao(atual, antes);
  if (v === null) return <span className={`text-xs ${claro ? "text-papel/60" : "text-cafe"}`}>sem base</span>;
  const sobe = v >= 0;
  const cor = claro
    ? "bg-papel/15 text-papel"
    : sobe
      ? "bg-[var(--p-verde-fundo)] text-verde"
      : "bg-[var(--p-vermelho-fundo)] text-[var(--p-vermelho)]";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${cor}`}>
      {sobe ? "▲" : "▼"} {pct(Math.abs(v))}
    </span>
  );
}

const COR_CANAL: Record<Canal, string> = { presencial: "bg-verde", delivery: "bg-chope" };

function Kpi({ rotulo, valor, atual, antes, ant }: { rotulo: string; valor: string; atual: number; antes: number; ant: string }) {
  return (
    <div className="p-cartao p-4">
      <p className="p-kpi-rotulo">{rotulo}</p>
      <p className="p-kpi-valor tabular-nums">{valor}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-cafe">
        <Variacao atual={atual} antes={antes} />
        ant. {ant}
      </p>
    </div>
  );
}

/** Barras verticais simples: dia a dia ou hora a hora. */
function Barras({ itens, destaque }: { itens: { rotulo: string; valor: number; titulo: string }[]; destaque?: number }) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const passo = itens.length > 16 ? Math.ceil(itens.length / 8) : 1;
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {itens.map((i, n) => (
          <div key={i.rotulo + n} className="flex h-full flex-1 items-end" title={`${i.titulo}: ${reais(i.valor)}`}>
            <div
              className={`w-full rounded-t-[3px] ${n === destaque ? "bg-chope" : "bg-verde/80"}`}
              style={{ height: `${Math.max((i.valor / max) * 100, i.valor ? 2 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[10px] tabular-nums text-cafe">
        {itens.map((i, n) => (
          <span key={i.rotulo + n} className="flex-1 text-center">
            {n % passo === 0 ? i.rotulo : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="p-cartao mt-4 p-4 sm:p-5">
      <h2 className="p-cartao-titulo">{titulo}</h2>
      {subtitulo ? <p className="mt-0.5 text-sm text-cafe">{subtitulo}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function Faturamento({
  searchParams,
}: {
  searchParams: Promise<Record<"ver" | "data" | "turno", string | string[] | undefined>>;
}) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  if (!ehGestor(sessao)) return null;

  const busca = await searchParams;
  const dia = hoje();
  const ver: Ver = busca.ver === "dia" || busca.ver === "semana" ? busca.ver : "mes";
  const pedida = typeof busca.data === "string" && DATA.test(busca.data) && busca.data <= dia ? busca.data : dia;
  const turno: Turno | undefined = busca.turno === "almoco" || busca.turno === "jantar" ? busca.turno : undefined;
  const p = periodoDe(ver, pedida, dia);

  const link = (mudar: Partial<{ ver: Ver; data: string; turno: Turno | "" }>) => {
    const q = new URLSearchParams();
    const v = mudar.ver ?? ver;
    if (v !== "mes") q.set("ver", v);
    const d = mudar.data ?? (mudar.ver ? dia : pedida);
    if (d !== dia) q.set("data", d);
    const t = mudar.turno === undefined ? turno : mudar.turno || undefined;
    if (t) q.set("turno", t);
    const s = q.toString();
    return `/faturamento${s ? `?${s}` : ""}`;
  };

  let erro = "";
  let atual: Resumo | null = null;
  let antes: Resumo | null = null;
  try {
    const comandas = await comandasDoPeriodo(p.antIni, p.fim);
    atual = resumir(comandas, p.ini, p.fim, turno);
    antes = resumir(comandas, p.antIni, p.antFim, turno);
  } catch (e) {
    erro = mensagemDe(e);
  }

  // dia a dia (semana e mês) ou hora a hora (dia)
  const evolucao =
    atual && p.ver === "dia"
      ? [...new Set([...Array.from({ length: 14 }, (_, n) => n + 10), ...atual.porHora.keys()])]
          // a madrugada (até as 6h) é o fim do jantar: vem depois das 23h
          .sort((x, y) => (x < 6 ? x + 24 : x) - (y < 6 ? y + 24 : y))
          .map((h) => ({
          rotulo: `${h}h`,
          titulo: `${h}h`,
          valor: atual!.porHora.get(h) ?? 0,
        }))
      : atual
        ? dias(p.ini, p.ver === "semana" ? somarDias(p.ini, 6) : fimDoMes(p.ini)).map((d) => ({
            rotulo: p.ver === "semana" ? semana(d) : String(Number(d.slice(8))),
            titulo: `${semana(d)}, ${ddmm(d)}`,
            valor: atual!.porDia.get(d) ?? 0,
          }))
        : [];
  const melhor = evolucao.reduce((m, i, n) => (i.valor > (evolucao[m]?.valor ?? 0) ? n : m), 0);

  // média por dia da semana (só no mês): soma ÷ quantos daquele dia tiveram venda (dia sem venda não puxa a média)
  const porSemana =
    atual && p.ver === "mes"
      ? ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((rotulo, i) => {
          const desses = dias(p.ini, p.fim).filter(
            (d) => (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7 === i && (atual!.porDia.get(d) ?? 0) > 0,
          );
          const soma = desses.reduce((s, d) => s + (atual!.porDia.get(d) ?? 0), 0);
          return { rotulo, titulo: `Média de ${rotulo}`, valor: desses.length ? soma / desses.length : 0 };
        })
      : [];
  const campeao = porSemana.reduce((m, i, n) => (i.valor > (porSemana[m]?.valor ?? 0) ? n : m), 0);
  const maxCanal = atual ? Math.max(...CANAIS.map((k) => atual!.canais[k].valor), 1) : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Faturamento"
        acoes={
          <div className="p-abas">
            {(["dia", "semana", "mes"] as const).map((v) => (
              <Link key={v} href={link({ ver: v })} aria-current={ver === v ? "page" : undefined} className="p-aba">
                {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
              </Link>
            ))}
          </div>
        }
      />

      <nav className="p-cartao mt-6 flex items-center justify-between gap-2 p-3" aria-label="Escolher o período">
        <Link href={link({ data: p.anterior })} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Período anterior">
          ‹
        </Link>
        <h2 className="text-center font-display text-xl first-letter:uppercase sm:text-2xl">{p.rotulo}</h2>
        {p.proximo ? (
          <Link href={link({ data: p.proximo })} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Próximo período">
            ›
          </Link>
        ) : (
          <span className="h-10 w-10" aria-hidden="true" />
        )}
      </nav>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Turno">
        {([["", "Os dois turnos"], ["almoco", "Almoço"], ["jantar", "Jantar"]] as const).map(([t, nome]) => (
          <Link key={t} href={link({ turno: t })} aria-current={(turno ?? "") === t ? "true" : undefined} className="p-chip">
            {nome}
          </Link>
        ))}
      </div>

      {erro ? (
        <p className="p-aviso p-aviso-alerta mt-4">
          Não consegui ler todas as vendas da Takeat ({erro}). Os dias já lidos ficam guardados: recarregue em um minuto.
        </p>
      ) : null}

      {atual && antes ? (
        <>
          {/* o número que importa: o total, na faixa verde, com os canais embaixo */}
          <section className="mt-4 rounded-[22px] bg-verde p-5 text-papel shadow-[var(--p-sombra-alta)] sm:p-6">
            <p className="text-[13px] font-semibold text-papel/75">
              Faturamento{turno ? ` · ${turno === "almoco" ? "almoço" : "jantar"}` : ""} · sem a taxa de serviço
            </p>
            <p className="mt-1 text-[40px] font-semibold leading-none tabular-nums sm:text-5xl">{reais(atual.total)}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-papel/75">
              <Variacao atual={atual.total} antes={antes.total} claro />
              vs {p.comparado}: {reais(antes.total)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-papel/15 pt-4">
              {CANAIS.map((k) => (
                <div key={k} className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-papel/70">{ROTULO_CANAL[k]}</p>
                  <p className="mt-0.5 truncate text-base font-semibold tabular-nums sm:text-lg">{reais(atual.canais[k].valor)}</p>
                </div>
              ))}
            </div>
          </section>

          <Secao titulo="Vendas por canal" subtitulo={`Ordenado por faturamento, vs ${p.comparado}`}>
            <ul className="space-y-4">
              {[...CANAIS]
                .sort((a, b) => atual!.canais[b].valor - atual!.canais[a].valor)
                .map((k) => {
                  const c = atual!.canais[k];
                  return (
                    <li key={k}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{ROTULO_CANAL[k]}</span>
                        <span className="font-semibold tabular-nums">{reais(c.valor)}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-creme">
                        <div className={`h-2 rounded-full ${COR_CANAL[k]}`} style={{ width: `${(c.valor / maxCanal) * 100}%` }} />
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cafe">
                        <span>
                          {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}
                        </span>
                        <span>· ticket {c.pedidos ? reais(c.valor / c.pedidos) : "–"}</span>
                        <Variacao atual={c.valor} antes={antes!.canais[k].valor} />
                      </p>
                    </li>
                  );
                })}
            </ul>
          </Secao>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi rotulo="Comandas" valor={String(atual.comandas)} atual={atual.comandas} antes={antes.comandas} ant={String(antes.comandas)} />
            <Kpi rotulo="Ticket médio" valor={reais(atual.ticket)} atual={atual.ticket} antes={antes.ticket} ant={reais(antes.ticket)} />
            <Kpi rotulo="Pessoas no salão" valor={String(atual.pessoas)} atual={atual.pessoas} antes={antes.pessoas} ant={String(antes.pessoas)} />
            <Kpi
              rotulo="Taxa de serviço"
              valor={reais(atual.taxaServico)}
              atual={atual.taxaServico}
              antes={antes.taxaServico}
              ant={reais(antes.taxaServico)}
            />
          </div>

          <Secao
            titulo={p.ver === "dia" ? "Hora a hora" : "Dia a dia"}
            subtitulo={
              evolucao[melhor]?.valor
                ? `${p.ver === "dia" ? "Melhor hora" : "Melhor dia"}: ${evolucao[melhor].titulo} · ${reais(evolucao[melhor].valor)}`
                : undefined
            }
          >
            <Barras itens={evolucao} destaque={evolucao[melhor]?.valor ? melhor : undefined} />
          </Secao>

          {porSemana.length ? (
            <Secao
              titulo="Média por dia da semana"
              subtitulo={porSemana[campeao]?.valor ? `Dia mais forte: ${porSemana[campeao].rotulo} · ${reais(porSemana[campeao].valor)}` : undefined}
            >
              <Barras itens={porSemana} destaque={porSemana[campeao]?.valor ? campeao : undefined} />
            </Secao>
          ) : null}

          <Secao titulo="Formas de pagamento" subtitulo="O que entrou por cada forma, já com a taxa de serviço.">
            {atual.pagamentos.length ? (
              <ul className="space-y-3">
                {atual.pagamentos.map((g) => {
                  const soma = atual!.pagamentos.reduce((s, x) => s + x.valor, 0);
                  return (
                    <li key={g.grupo}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span>{ROTULO_PAGAMENTO[g.grupo]}</span>
                        <span className="tabular-nums">
                          {reais(g.valor)} <span className="text-cafe">· {pct(g.valor / soma)}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-creme">
                        <div className="h-1.5 rounded-full bg-verde/80" style={{ width: `${(g.valor / soma) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-cafe">Sem pagamentos no período.</p>
            )}
          </Secao>

          <Secao titulo="Os 10 mais vendidos" subtitulo="Por faturamento do produto no período.">
            {atual.produtos.length ? (
              <ol className="divide-y divide-linha/70">
                {atual.produtos.map((x, i) => (
                  <li key={x.nome} className="flex items-baseline gap-3 py-2 text-sm">
                    <span className="w-5 shrink-0 text-right tabular-nums text-cafe">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{x.nome}</span>
                    <span className="shrink-0 tabular-nums text-cafe">{x.qtd}×</span>
                    <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{reais(x.receita)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-cafe">Sem vendas no período.</p>
            )}
          </Secao>
        </>
      ) : null}
    </div>
  );
}
