// O resumo de faturamento da tela /faturamento (pedido do Bruno em 26/11/2026,
// inspirado no relatório mensal da Takeat): total, canais (presencial,
// delivery próprio e iFood), comandas, ticket médio, pessoas, taxa de serviço,
// dia a dia, hora a hora, dia da semana, formas de pagamento e os produtos
// mais vendidos. Puro: recebe as comandas já lidas e o filtro de turno.
//
// Mesmas regras do CMV (lib/cmv/calculo.ts): comanda cancelada fica de fora;
// o valor é o pago (sem o "clube"), limitado ao total da comanda.

import type { Comanda } from "@/lib/takeat/comandas";
import { apurarVendas } from "@/lib/cmv/calculo";

export type Turno = "almoco" | "jantar";
export type Canal = "presencial" | "delivery" | "ifood";
export const CANAIS: Canal[] = ["presencial", "delivery", "ifood"];
export const ROTULO_CANAL: Record<Canal, string> = { presencial: "Presencial", delivery: "Delivery próprio", ifood: "iFood" };

export type GrupoPagamento = "credito" | "debito" | "pix" | "dinheiro" | "voucher" | "online" | "prazo" | "outros";
export const ROTULO_PAGAMENTO: Record<GrupoPagamento, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
  voucher: "Voucher",
  online: "Pagamento online",
  prazo: "A prazo",
  outros: "Outras formas",
};

const num = (v: string | number | null | undefined) => Number(v) || 0;
const FUSO = "America/Sao_Paulo";
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const formatoHora = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false });

/**
 * Dia (AAAA-MM-DD) e hora (0–23) de Ouro Fino em que a comanda abriu, e o turno.
 * Mesmas regras da Caixinha (lib/caixinha/takeat.ts): jantar a partir das 17h,
 * e o que abre até as 6h da manhã conta no jantar do dia anterior.
 */
export function quando(iso: string): { dia: string; hora: number; turno: Turno } {
  const d = new Date(iso);
  const hora = Number(formatoHora.format(d)) % 24;
  const dia = formatoDia.format(d);
  if (hora < 6) return { dia: formatoDia.format(new Date(d.getTime() - 86_400_000)), hora, turno: "jantar" };
  return { dia, hora, turno: hora < 17 ? "almoco" : "jantar" };
}

export function canalDe(c: Comanda): Canal {
  const delivery = c.is_delivery || c.table?.table_type === "delivery";
  if (!delivery) return "presencial";
  return c.ifood_document || /ifood/i.test(c.sales_channel ?? "") ? "ifood" : "delivery";
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function grupoDe(nome: string): GrupoPagamento {
  const n = semAcento(nome);
  if (/^dinheiro/.test(n)) return "dinheiro";
  if (/online|ifood/.test(n)) return "online";
  if (/credito/.test(n)) return "credito";
  if (/debito/.test(n)) return "debito";
  if (/pix/.test(n)) return "pix";
  if (/voucher|ticket|vale|alimenta|refei|sodexo|pluxee|alelo|\bvr\b/.test(n)) return "voucher";
  if (/prazo/.test(n)) return "prazo";
  return "outros";
}

export type Venda = { dia: string; hora: number; turno: Turno; canal: Canal; valor: number; pessoas: number; taxa: number };

const pagoTudo = (c: Comanda) => (c.payments ?? []).reduce((s, p) => s + num(p.payment_value), 0);

/** As vendas válidas, com dia, hora, turno e canal. O valor é sem a taxa de serviço. */
export function vendasDe(comandas: Comanda[]): (Venda & { comanda: Comanda })[] {
  const lista: (Venda & { comanda: Comanda })[] = [];
  for (const c of comandas) {
    if (c.status === "canceled" || c.delivery_canceled_at) continue;
    const pago = (c.payments ?? [])
      .filter((p) => p.payment_method?.keyword !== "clube")
      .reduce((s, p) => s + num(p.payment_value), 0);
    if (pago <= 0) continue;
    const canal = canalDe(c);
    const teto = canal === "presencial" ? num(c.total_price) : num(c.total_delivery_price) || num(c.total_price);
    const { dia, hora, turno } = quando(c.start_time);
    const consumo = num(c.total_price);
    // total_service_price é o total COM a taxa: a taxa é o que foi pago acima do consumo (como na Caixinha)
    const taxa =
      canal === "presencial" ? Math.max(0, Math.min(pagoTudo(c), num(c.total_service_price) || consumo) - consumo) : 0;
    lista.push({
      comanda: c,
      dia,
      hora,
      turno,
      canal,
      valor: Math.min(pago, teto || pago),
      pessoas: canal === "presencial" ? Math.max(1, Math.round(num(c.people_at_table))) : 0,
      taxa,
    });
  }
  return lista;
}

export type Resumo = {
  total: number;
  comandas: number;
  ticket: number;
  pessoas: number;
  taxaServico: number;
  canais: Record<Canal, { valor: number; pedidos: number }>;
  porDia: Map<string, number>;
  porHora: Map<number, number>;
  pagamentos: { grupo: GrupoPagamento; valor: number }[];
  produtos: { nome: string; qtd: number; receita: number }[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** O resumo das comandas abertas de `ini` a `fim` (dias de Ouro Fino), no turno pedido. */
export function resumir(comandas: Comanda[], ini: string, fim: string, turno?: Turno): Resumo {
  const vendas = vendasDe(comandas).filter((v) => v.dia >= ini && v.dia <= fim && (!turno || v.turno === turno));
  const canais = Object.fromEntries(CANAIS.map((k) => [k, { valor: 0, pedidos: 0 }])) as Resumo["canais"];
  const porDia = new Map<string, number>();
  const porHora = new Map<number, number>();
  const pag = new Map<GrupoPagamento, number>();
  let total = 0;
  let pessoas = 0;
  let taxa = 0;
  for (const v of vendas) {
    total += v.valor;
    pessoas += v.pessoas;
    taxa += v.taxa;
    canais[v.canal].valor += v.valor;
    canais[v.canal].pedidos += 1;
    porDia.set(v.dia, (porDia.get(v.dia) ?? 0) + v.valor);
    porHora.set(v.hora, (porHora.get(v.hora) ?? 0) + v.valor);
    for (const p of v.comanda.payments ?? []) {
      if (p.payment_method?.keyword === "clube") continue;
      const g = grupoDe(p.payment_method?.name ?? "");
      pag.set(g, (pag.get(g) ?? 0) + num(p.payment_value));
    }
  }
  for (const k of CANAIS) canais[k].valor = r2(canais[k].valor);
  const produtos = apurarVendas(vendas.map((v) => v.comanda))
    .produtos.map((p) => ({ nome: p.nome, qtd: p.qtd, receita: r2(p.receita) }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10);
  return {
    total: r2(total),
    comandas: vendas.length,
    ticket: vendas.length ? r2(total / vendas.length) : 0,
    pessoas,
    taxaServico: r2(taxa),
    canais,
    porDia,
    porHora,
    pagamentos: [...pag]
      .map(([grupo, valor]) => ({ grupo, valor: r2(valor) }))
      .filter((p) => p.valor > 0)
      .sort((a, b) => b.valor - a.valor),
    produtos,
  };
}

/** Variação de `atual` contra `antes` (null quando não há base). */
export const variacao = (atual: number, antes: number) => (antes > 0 ? (atual - antes) / antes : null);
