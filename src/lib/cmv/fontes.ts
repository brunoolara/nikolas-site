// De onde o CMV lê, no servidor:
// - custo de ficha de cada produto e complemento vendido: uma consulta por
//   ficha na Takeat (não há leitura em lote). São centenas, então ficam num
//   arquivo e são atualizadas aos poucos, em segundo plano, no máximo 15 por
//   vez e com pausa entre elas, priorizando as que faltam;
// - compras: NF-e recebidas na Takeat no período, item a item (bloco SPED),
//   guardadas por semana.

import "server-only";
import { get, put } from "@/lib/loja";
import { ErroTakeat, takeatGet } from "@/lib/takeat/cliente";
import { itensDaNota, type Custos } from "./calculo";

const PASTA = process.env.NODE_ENV === "production" ? "takeat" : "takeat-teste";
const ARQ_CUSTOS = `${PASTA}/custos.json`;
const ARQ_TRAVA = `${PASTA}/custos-trava.json`;
/** Ficha com custo lido há mais que isto é lida de novo. */
const VALIDADE_CUSTO = 7 * 86_400_000;
const POR_RODADA = 15;
const PAUSA_MS = 6_500;

async function lerJson<T>(caminho: string): Promise<T | null> {
  try {
    const res = await get(caminho, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return (await new Response(res.stream).json()) as T;
  } catch {
    return null;
  }
}

const gravar = (caminho: string, valor: unknown) =>
  put(caminho, JSON.stringify(valor), { access: "private", contentType: "application/json", allowOverwrite: true });

export async function lerCustos(): Promise<Custos> {
  return (await lerJson<Custos>(ARQ_CUSTOS)) ?? { produtos: {}, complementos: {} };
}

/** Quais fichas precisam ser lidas (faltando primeiro, depois as mais velhas). */
export function fichasPendentes(custos: Custos, produtos: number[], complementos: number[]) {
  const agora = Date.now();
  const velha = (r?: { em: string }) => !r || agora - new Date(r.em).getTime() > VALIDADE_CUSTO;
  const lista = [
    ...produtos.filter((id) => !custos.produtos[id]).map((id) => ({ tipo: "produto" as const, id })),
    ...complementos.filter((id) => !custos.complementos[id]).map((id) => ({ tipo: "complemento" as const, id })),
    ...produtos.filter((id) => custos.produtos[id] && velha(custos.produtos[id])).map((id) => ({ tipo: "produto" as const, id })),
    ...complementos
      .filter((id) => custos.complementos[id] && velha(custos.complementos[id]))
      .map((id) => ({ tipo: "complemento" as const, id })),
  ];
  return lista;
}

/**
 * Lê na Takeat o custo de até 15 fichas pendentes e grava. Feita para rodar
 * depois da resposta (after), com uma trava para não haver duas ao mesmo tempo.
 */
export async function atualizarCustos(pendentes: { tipo: "produto" | "complemento"; id: number }[]) {
  if (!pendentes.length) return;
  const trava = await lerJson<{ em: string }>(ARQ_TRAVA);
  if (trava && Date.now() - new Date(trava.em).getTime() < 5 * 60_000) return;
  await gravar(ARQ_TRAVA, { em: new Date().toISOString() });

  const lidos: { tipo: "produto" | "complemento"; id: number; custo: number }[] = [];
  try {
    for (const [i, f] of pendentes.slice(0, POR_RODADA).entries()) {
      if (i) await new Promise((ok) => setTimeout(ok, PAUSA_MS));
      try {
        const rota = f.tipo === "produto" ? `/v1/products/${f.id}/technical-sheet` : `/v1/complements/${f.id}/technical-sheet`;
        const ficha = await takeatGet<{ cost?: string | number }>(rota, {}, "normal");
        lidos.push({ ...f, custo: Number(ficha.cost) || 0 });
      } catch (erro) {
        // sem ficha (404) conta como custo zero; limite ou cota: para a rodada
        if (erro instanceof ErroTakeat && erro.status === 404) lidos.push({ ...f, custo: 0 });
        else break;
      }
    }
  } finally {
    if (lidos.length) {
      const custos = await lerCustos();
      const em = new Date().toISOString();
      for (const l of lidos) (l.tipo === "produto" ? custos.produtos : custos.complementos)[l.id] = { custo: l.custo, em };
      await gravar(ARQ_CUSTOS, custos);
    }
    await gravar(ARQ_TRAVA, { em: new Date(0).toISOString() });
  }
}

type Nota = {
  id: number;
  status?: { situation?: string };
  cancellation?: { canceled_at?: string | null; locally_canceled_at?: string | null };
  timestamps?: { issued_at?: string };
  fiscal?: { sped?: { body?: string } };
};

export type Compra = { nota: number; emitidaEm: string; insumo: number; valor: number };

/**
 * Itens das NF-e recebidas emitidas entre os dias `ini` e `fim` (inclusive).
 * Semanas que já passaram ficam guardadas; a atual vale 2 min.
 */
export async function comprasDoPeriodo(ini: string, fim: string): Promise<Compra[]> {
  const caminho = `${PASTA}/compras/${ini}_${fim}.json`;
  const guardada = await lerJson<{ em: string; fechada: boolean; compras: Compra[] }>(caminho);
  if (guardada && (guardada.fechada || Date.now() - new Date(guardada.em).getTime() < 2 * 60_000))
    return guardada.compras;

  const corpo = await takeatGet<
    { invoices?: Nota[] }[] | { items?: { invoices?: Nota[] }[]; data?: { invoices?: Nota[] }[] } | Nota[]
  >("/v1/nfe-received", { start_date: ini, end_date: fim }, "normal");
  const grupos = Array.isArray(corpo) ? corpo : (corpo.items ?? corpo.data ?? []);
  const notas: Nota[] = grupos.flatMap((g) => ("invoices" in g && g.invoices ? g.invoices : [g as Nota]));

  const compras: Compra[] = [];
  for (const n of notas) {
    if (n.cancellation?.canceled_at || n.cancellation?.locally_canceled_at) continue;
    if (n.status?.situation && n.status.situation !== "autorizada") continue;
    for (const it of itensDaNota(n.fiscal?.sped?.body))
      compras.push({ nota: n.id, emitidaEm: n.timestamps?.issued_at ?? "", insumo: it.insumo, valor: it.valor });
  }
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  await gravar(caminho, { em: new Date().toISOString(), fechada: fim < hoje, compras });
  return compras;
}
