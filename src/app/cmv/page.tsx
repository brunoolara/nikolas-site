// CMV do Nikola's, simples e direto: faturamento, CMV teórico (fichas ×
// vendas), CMV real (contagem + compras − contagem) e margem, com os pratos
// que mais pesam. O período fica no endereço: ?semana=AAAA-MM-DD (segunda)
// ou ?mes=AAAA-MM. Sem nada, a semana atual.

import Link from "next/link";
import { after } from "next/server";
import { exigir } from "@/lib/acessos/sessao";
import { hoje } from "@/lib/posts/tipos";
import { comandasDoPeriodo } from "@/lib/takeat/comandas";
import { mensagemDe } from "@/lib/takeat/cliente";
import { apurarVendas, cmvReal, cmvTeorico, pct, valorDaContagem, type Real } from "@/lib/cmv/calculo";
import { atualizarCustos, comprasDoPeriodo, fichasPendentes, lerCustos } from "@/lib/cmv/fontes";
import { lerAjustes, lerContagem } from "@/lib/estoque/armazem";
import { FORA_DO_CMV, categoriaPeloNome, rotuloSemana, semanaDe, somarDias } from "@/lib/estoque/categorias";
import { lerInsumos } from "@/lib/estoque/insumos";
import { reais } from "@/lib/caixinha/tipos";
import Cabecalho from "@/components/painel/Cabecalho";

export const maxDuration = 300;

/** Referência de CMV para a casa toda (as metas por categoria ficam na Takeat). */
const META = 0.35;

type Periodo = { tipo: "semana" | "mes"; ini: string; fim: string; rotulo: string; anterior: string; proximo: string };

function periodoDe(busca: Record<string, string | string[] | undefined>): Periodo {
  const dia = hoje();
  if (typeof busca.mes === "string" && /^\d{4}-\d{2}$/.test(busca.mes)) {
    const [a, m] = busca.mes.split("-").map(Number);
    const ini = `${busca.mes}-01`;
    const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
    const mes = (n: number) => new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
    const rotulo = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
    return { tipo: "mes", ini, fim: fim < dia ? fim : dia, rotulo, anterior: `?mes=${mes(-1)}`, proximo: `?mes=${mes(1)}` };
  }
  const pedida = typeof busca.semana === "string" ? busca.semana : "";
  const ini = /^\d{4}-\d{2}-\d{2}$/.test(pedida) && semanaDe(pedida) === pedida ? pedida : semanaDe(dia);
  const fim = somarDias(ini, 6);
  return {
    tipo: "semana",
    ini,
    fim: fim < dia ? fim : dia,
    rotulo: `Semana ${rotuloSemana(ini)}`,
    anterior: `?semana=${somarDias(ini, -7)}`,
    proximo: `?semana=${somarDias(ini, 7)}`,
  };
}

/** CMV real de uma semana, se ela e a anterior tiverem contagem fechada. */
async function realDaSemana(segunda: string): Promise<Real | { falta: string }> {
  const [atual, anterior, ajustes] = await Promise.all([
    lerContagem(segunda),
    lerContagem(somarDias(segunda, -7)),
    lerAjustes(),
  ]);
  if (!anterior.fechada) return { falta: `a contagem da semana ${rotuloSemana(somarDias(segunda, -7))} (estoque inicial)` };
  if (!atual.fechada) return { falta: `a contagem desta semana (estoque final)` };

  let insumos: Awaited<ReturnType<typeof lerInsumos>>["insumos"] = [];
  try {
    insumos = (await lerInsumos()).insumos;
  } catch {
    /* sem a Takeat, usa só os custos guardados no fechamento */
  }
  const nomes = new Map(insumos.map((i) => [String(i.id), i.nome]));
  const custoAtual = new Map(insumos.map((i) => [String(i.id), i.custo]));
  const entra = (id: string) => {
    if (ajustes[id]?.naoContar) return false;
    const categoria = ajustes[id]?.categoria ?? categoriaPeloNome(nomes.get(id) ?? "");
    return !FORA_DO_CMV.includes(categoria);
  };
  const custo = (snap: typeof atual.fechada) => (id: string) => snap?.takeat?.[id]?.custo ?? custoAtual.get(id) ?? 0;
  const qtds = (c: typeof atual) => Object.fromEntries(Object.entries(c.itens).map(([id, l]) => [id, l.qtd]));

  const compras = (await comprasDoPeriodo(segunda, somarDias(segunda, 6)))
    .filter((c) => entra(String(c.insumo)))
    .reduce((s, c) => s + c.valor, 0);
  return cmvReal(
    valorDaContagem(qtds(anterior), custo(anterior.fechada), entra),
    compras,
    valorDaContagem(qtds(atual), custo(atual.fechada), entra),
  );
}

export default async function Cmv({ searchParams }: PageProps<"/cmv">) {
  if (!(await exigir("master")).liberado) return null;
  const p = periodoDe(await searchParams);

  let erro = "";
  let comandas: Awaited<ReturnType<typeof comandasDoPeriodo>> = [];
  try {
    comandas = await comandasDoPeriodo(p.ini, p.fim);
  } catch (e) {
    erro = mensagemDe(e);
  }
  const vendas = apurarVendas(comandas);
  const custos = await lerCustos();
  const teorico = cmvTeorico(vendas, custos);
  const pendentes = fichasPendentes(
    custos,
    vendas.produtos.map((v) => v.id),
    [...vendas.complementos.keys()],
  );
  if (pendentes.length) after(() => atualizarCustos(pendentes));

  // CMV real: na semana, a própria; no mês, as semanas que começam nele
  const semanas =
    p.tipo === "semana"
      ? [p.ini]
      : Array.from({ length: 6 }, (_, i) => somarDias(semanaDe(p.ini), 7 * i)).filter(
          (s) => s >= p.ini && s <= p.fim,
        );
  const reais_ = await Promise.all(
    semanas.map(async (s) => {
      try {
        return { semana: s, r: await realDaSemana(s) };
      } catch (e) {
        return { semana: s, r: { falta: mensagemDe(e) } as const };
      }
    }),
  );
  const real = p.tipo === "semana" ? reais_[0].r : null;
  const realOk = real && "cmv" in real ? real : null;

  const fat = vendas.faturamento;
  const cmvT = fat > 0 ? teorico.custo / fat : null;
  const cmvR = realOk && fat > 0 ? realOk.cmv / fat : null;
  const base = realOk ? realOk.cmv : teorico.custo;
  const margem = fat > 0 ? (fat - base) / fat : null;
  const corCmv = (v: number | null) =>
    v === null ? "" : v <= META ? "text-verde" : v <= META * 1.12 ? "text-[var(--p-ambar-texto)]" : "text-[var(--p-vermelho)]";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="CMV"
        descricao="Quanto da venda vira custo de mercadoria, pelas fichas técnicas e pela contagem do estoque."
        acoes={
          <div className="p-abas">
            <Link href="/cmv" aria-current={p.tipo === "semana" ? "page" : undefined} className="p-aba">
              Semana
            </Link>
            <Link href={`/cmv?mes=${hoje().slice(0, 7)}`} aria-current={p.tipo === "mes" ? "page" : undefined} className="p-aba">
              Mês
            </Link>
          </div>
        }
      />

      <nav className="p-cartao mt-6 flex items-center justify-between gap-2 p-3" aria-label="Escolher o período">
        <Link href={`/cmv${p.anterior}`} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Período anterior">
          ‹
        </Link>
        <h2 className="font-display text-2xl first-letter:uppercase">{p.rotulo}</h2>
        <Link href={`/cmv${p.proximo}`} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Próximo período">
          ›
        </Link>
      </nav>

      {erro ? <p className="p-aviso p-aviso-alerta mt-4">Não consegui ler as vendas da Takeat: {erro}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-cartao p-4">
          <p className="p-kpi-rotulo">Faturamento</p>
          <p className="p-kpi-valor">{reais(fat)}</p>
          <p className="mt-0.5 text-xs text-cafe">
            Salão {reais(vendas.salao)} · Delivery {reais(vendas.delivery)}
          </p>
        </div>
        <div className="p-cartao p-4">
          <p className="p-kpi-rotulo">CMV teórico</p>
          <p className={`p-kpi-valor ${corCmv(cmvT)}`}>{pct(cmvT)}</p>
          <p className="mt-0.5 text-xs text-cafe">{reais(teorico.custo)} pelas fichas · meta {pct(META)}</p>
        </div>
        <div className="p-cartao p-4">
          <p className="p-kpi-rotulo">CMV real</p>
          {realOk ? (
            <>
              <p className={`p-kpi-valor ${corCmv(cmvR)}`}>{pct(cmvR)}</p>
              <p className="mt-0.5 text-xs text-cafe">{reais(realOk.cmv)} pela contagem</p>
            </>
          ) : (
            <>
              <p className="p-kpi-valor text-cafe">—</p>
              <p className="mt-0.5 text-xs text-cafe">
                {p.tipo === "mes" ? "Veja por semana abaixo." : real && "falta" in real ? `Falta ${real.falta}.` : ""}
              </p>
            </>
          )}
        </div>
        <div className="p-cartao p-4">
          <p className="p-kpi-rotulo">Margem bruta</p>
          <p className="p-kpi-valor">{pct(margem)}</p>
          <p className="mt-0.5 text-xs text-cafe">
            {reais(fat - base)} · sobre o CMV {realOk ? "real" : "teórico"}
          </p>
        </div>
      </div>

      {realOk ? (
        <div className="p-cartao mt-4 p-4 text-sm">
          <p className="font-semibold">Como o CMV real foi calculado</p>
          <p className="mt-1 tabular-nums text-cafe">
            Estoque inicial {reais(realOk.inicial)} + compras {reais(realOk.compras)} − estoque final {reais(realOk.final)} ={" "}
            <strong className="text-tinta">{reais(realOk.cmv)}</strong>
          </p>
          {cmvT !== null && cmvR !== null ? (
            <p className="mt-1 text-cafe">
              Real {cmvR > cmvT ? "acima" : "abaixo"} do teórico em {pct(Math.abs(cmvR - cmvT))} do faturamento
              {cmvR - cmvT > 0.03
                ? ": sinal de perda, desperdício, porção maior que a ficha ou ficha desatualizada."
                : cmvT - cmvR > 0.03
                  ? ": confira a contagem e as notas lançadas."
                  : ": dentro do esperado."}
            </p>
          ) : null}
        </div>
      ) : null}

      {p.tipo === "mes" && reais_.length ? (
        <section className="p-cartao mt-4 p-5">
          <h3 className="p-cartao-titulo">CMV real por semana</h3>
          <ul className="mt-3 divide-y divide-linha/70 text-sm">
            {reais_.map(({ semana, r }) => (
              <li key={semana} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/cmv?semana=${semana}`} className="font-medium text-verde hover:underline">
                  Semana {rotuloSemana(semana)}
                </Link>
                <span className="tabular-nums text-cafe">{"cmv" in r ? reais(r.cmv) : `falta ${r.falta}`}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {teorico.cobertura < 0.98 && vendas.produtos.length ? (
        <p className="p-aviso p-aviso-info mt-4">
          {pct(teorico.cobertura)} das vendas já têm o custo da ficha.{" "}
          {pendentes.length
            ? `Os custos que faltam são buscados na Takeat aos poucos (${pendentes.length} ${pendentes.length === 1 ? "ficha" : "fichas"} na fila); recarregue daqui a alguns minutos.`
            : "Os itens que faltam estão sem ficha técnica (ou com ficha sem custo) na Takeat; veja a lista abaixo."}
        </p>
      ) : null}

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Os pratos que mais pesam no custo</h3>
        {teorico.itens.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="p-tabela">
              <thead>
                <tr>
                  <th>Prato</th>
                  <th className="num">Vendidos</th>
                  <th className="num">Vendeu</th>
                  <th className="num">Custo</th>
                  <th className="num">CMV</th>
                </tr>
              </thead>
              <tbody>
                {teorico.itens.slice(0, 15).map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.nome}</td>
                    <td className="num">{i.qtd}</td>
                    <td className="num">{reais(i.receita)}</td>
                    <td className="num">{reais(i.custoTotal)}</td>
                    <td className={`num font-semibold ${corCmv(i.cmv)}`}>{pct(i.cmv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-cafe">Sem vendas com custo de ficha neste período.</p>
        )}
      </section>

      {teorico.semCusto.length ? (
        <details className="p-cartao mt-4 p-5">
          <summary className="cursor-pointer font-semibold">
            Vendidos ainda sem custo de ficha ({teorico.semCusto.length})
          </summary>
          <ul className="mt-2 grid gap-1 text-sm text-cafe sm:grid-cols-2">
            {teorico.semCusto.map((v) => (
              <li key={v.id}>
                {v.nome} · {v.qtd} vendidos
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="mt-6 text-xs text-cafe">
        Faturamento pelas comandas pagas da Takeat, sem os 10% e sem cashback. CMV teórico pelo custo atual das fichas
        técnicas. CMV real pela contagem de estoque fechada (segunda a domingo) e pelas notas de compra recebidas na
        Takeat, sem limpeza e descartáveis.
      </p>
    </div>
  );
}
