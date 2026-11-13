// Regras das telas ao vivo (mesas e delivery), sem nada de servidor: recebem
// as comandas da Takeat e o "agora", e devolvem o que a tela mostra.
//
// Decisões do Bruno (10/11/2026):
// - Delivery: o relógio de 1h conta da abertura do pedido até ele SAIR para
//   entrega ("saiu para entrega" na Takeat). Retirada no balcão conta até
//   ficar pronto. Passou de 1h, vermelho; a partir de 45 min, âmbar.
// - (13/11/2026) No Nikola's o "Pronto" da Takeat é quando o pedido SAI: a
//   equipe marca pronto na hora em que o motoboy leva, e depois finaliza. O
//   kanban fica: em preparo → saiu → finalizado. O relógio para no pronto.
// - Mesas: "sem pedir" conta do ÚLTIMO pedido válido (não da abertura).
//   Passou de 30 min, a mesa fica em alerta.

import type { Comanda } from "@/lib/takeat/comandas";

export const LIMITE_DELIVERY_MIN = 60;
export const ATENCAO_DELIVERY_MIN = 45;
export const LIMITE_MESA_MIN = 30;
/** O dia de serviço vira às 5h: o jantar que passa da meia-noite é do dia anterior. */
const VIRADA_HORA = 5;

const num = (v: string | null | undefined) => Number(v) || 0;
const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
const min = (de: number, ate: number) => Math.max(0, Math.round((ate - de) / 60_000));

/** Início do dia de serviço que contém `agora` (5h de Brasília), em ms. */
export function inicioDoServico(agora: number): number {
  const brasil = new Date(agora - 3 * 3_600_000);
  let inicio = Date.UTC(brasil.getUTCFullYear(), brasil.getUTCMonth(), brasil.getUTCDate(), VIRADA_HORA + 3);
  if (agora < inicio) inicio -= 86_400_000;
  return inicio;
}

export const ehDelivery = (c: Comanda) => Boolean(c.is_delivery) || c.table?.table_type === "delivery";
const cancelada = (c: Comanda) => c.status === "canceled" || Boolean(c.delivery_canceled_at);
const finalizada = (c: Comanda) =>
  Boolean(c.completed_at || c.end_time || c.status_timings?.completed_at) ||
  ["finished", "completed", "closed"].includes(c.status);

export type ItemPedido = { nome: string; qtd: number; obs: string | null; complementos: string[] };

function itensDe(c: Comanda): ItemPedido[] {
  const itens: ItemPedido[] = [];
  for (const conta of c.bills ?? [])
    for (const cesta of conta.order_baskets ?? []) {
      if (cesta.canceled_at || cesta.order_status === "canceled") continue;
      for (const p of cesta.orders ?? []) {
        if (p.canceled_at) continue;
        itens.push({
          nome: p.product?.name?.trim() || "Item",
          qtd: p.amount,
          obs: p.details?.trim() || null,
          complementos: (p.complement_categories ?? []).flatMap((cc) =>
            (cc.order_complements ?? []).map((oc) => oc.complement?.name ?? "").filter(Boolean),
          ),
        });
      }
    }
  return itens;
}

// ------------------------------------------------------------------ delivery

export type EtapaDelivery = "aguardando" | "preparo" | "saiu" | "finalizado" | "cancelado";

export type PedidoDelivery = {
  id: number;
  senha: number | null;
  cliente: string;
  telefone: string | null;
  endereco: string;
  bairro: string;
  retirada: boolean;
  ifood: boolean;
  agendadoPara: string | null;
  inicio: string;
  etapa: EtapaDelivery;
  /** Minutos da abertura até sair (ou até agora, se ainda não saiu). */
  minutos: number;
  /** O relógio parou (saiu, ou retirada pronta)? */
  parado: boolean;
  alerta: "ok" | "atencao" | "atrasado";
  valor: number;
  itens: ItemPedido[];
  marcos: { rotulo: string; em: string }[];
};

function etapaDelivery(c: Comanda): EtapaDelivery {
  if (cancelada(c)) return "cancelado";
  if (c.status === "waiting_payment") return "aguardando";
  const t = c.status_timings;
  if (finalizada(c)) return "finalizado";
  // pronto na Takeat = já saiu (ver o topo do arquivo)
  if (t?.ready_at || t?.ongoing_at || t?.delivered_at) return "saiu";
  return "preparo";
}

export function pedidoDelivery(c: Comanda, agora: number): PedidoDelivery {
  const conta = c.bills?.[0];
  const end = conta?.buyer?.delivery_address ?? {};
  const t = c.status_timings;
  const retirada = Boolean(c.with_withdrawal);
  const etapa = etapaDelivery(c);
  const inicio = ms(c.start_time);
  // onde o relógio para: no pronto (que aqui é a saída); sem ele, saiu para
  // entrega ou entregue; sem marca nenhuma, a finalização da comanda
  const fimRelogio = retirada
    ? ms(t?.ready_at) || ms(c.completed_at || c.end_time)
    : ms(t?.ready_at) || ms(t?.ongoing_at) || ms(t?.delivered_at) || ms(c.completed_at || c.end_time);
  const parado = Number.isFinite(fimRelogio) || etapa === "cancelado";
  const minutos = min(inicio, Number.isFinite(fimRelogio) ? fimRelogio : agora);
  const ativo = etapa === "preparo" || etapa === "aguardando";
  const alerta: PedidoDelivery["alerta"] =
    etapa === "cancelado"
      ? "ok"
      : minutos >= LIMITE_DELIVERY_MIN
        ? "atrasado"
        : ativo && minutos >= ATENCAO_DELIVERY_MIN
          ? "atencao"
          : "ok";

  const marcos = [
    { rotulo: "Pedido", em: c.start_time },
    { rotulo: "Aceito", em: t?.accepted_at ?? "" },
    { rotulo: retirada ? "Pronto" : "Pronto / saiu", em: t?.ready_at ?? "" },
    { rotulo: "Saiu para entrega", em: t?.ongoing_at ?? "" },
    { rotulo: "Entregue", em: t?.delivered_at ?? "" },
    { rotulo: "Finalizado", em: c.completed_at || c.end_time || "" },
    { rotulo: "Cancelado", em: c.delivery_canceled_at ?? "" },
  ].filter((m) => m.em);

  return {
    id: c.id,
    senha: c.attendance_password,
    cliente: conta?.buyer?.name?.trim() || "Cliente",
    telefone: conta?.buyer?.phone ?? null,
    endereco: [end.street, end.number, end.complement].filter(Boolean).join(", "),
    bairro: end.neighborhood ?? "",
    retirada,
    ifood: Boolean(c.ifood_document) || /ifood/i.test(c.sales_channel ?? ""),
    agendadoPara: c.scheduled_to,
    inicio: c.start_time,
    etapa,
    minutos,
    parado,
    alerta,
    valor: num(c.total_delivery_price) || num(c.total_price),
    itens: itensDe(c),
    marcos,
  };
}

export type PainelDelivery = {
  emPreparo: PedidoDelivery[];
  saiu: PedidoDelivery[];
  finalizados: PedidoDelivery[];
  aguardando: PedidoDelivery[];
  atrasados: number;
  totalHoje: number;
  pedidosHoje: number;
  /** Média de minutos até sair, entre os que já saíram hoje. */
  mediaAteSair: number | null;
  saiuNoPrazo: number;
  saiuAtrasado: number;
};

export function painelDelivery(comandas: Comanda[], agora: number): PainelDelivery {
  const inicioDia = inicioDoServico(agora);
  const pedidos = comandas
    .filter(ehDelivery)
    .map((c) => pedidoDelivery(c, agora))
    // de dias anteriores, só o que ainda está em aberto
    .filter((p) => ms(p.inicio) >= inicioDia || p.etapa === "preparo" || p.etapa === "saiu")
    .sort((a, b) => ms(a.inicio) - ms(b.inicio));

  const doDia = pedidos.filter((p) => ms(p.inicio) >= inicioDia && p.etapa !== "cancelado" && p.etapa !== "aguardando");
  const sairam = doDia.filter((p) => p.parado && p.etapa !== "preparo");
  return {
    emPreparo: pedidos.filter((p) => p.etapa === "preparo"),
    saiu: pedidos.filter((p) => p.etapa === "saiu"),
    finalizados: pedidos.filter((p) => p.etapa === "finalizado" || p.etapa === "cancelado").reverse(),
    aguardando: pedidos.filter((p) => p.etapa === "aguardando"),
    atrasados: pedidos.filter((p) => p.etapa === "preparo" && p.alerta === "atrasado").length,
    totalHoje: doDia.reduce((s, p) => s + p.valor, 0),
    pedidosHoje: doDia.length,
    mediaAteSair: sairam.length ? Math.round(sairam.reduce((s, p) => s + p.minutos, 0) / sairam.length) : null,
    saiuNoPrazo: sairam.filter((p) => p.minutos < LIMITE_DELIVERY_MIN).length,
    saiuAtrasado: sairam.filter((p) => p.minutos >= LIMITE_DELIVERY_MIN).length,
  };
}

// --------------------------------------------------------------------- mesas

export type Rodada = { em: string; garcom: string | null; itens: ItemPedido[] };

export type Mesa = {
  id: number;
  rotulo: string;
  balcao: boolean;
  inicio: string;
  abertaHa: number;
  ultimoPedido: string;
  semPedirHa: number;
  parada: boolean;
  consumo: number;
  garcons: string[];
  clientes: string[];
  rodadas: Rodada[];
  qtdItens: number;
};

const aberta = (c: Comanda) =>
  !c.end_time && !c.completed_at && !["canceled", "finished", "completed", "closed", "transferred"].includes(c.status);

export function mesaDe(c: Comanda, agora: number): Mesa {
  const rodadas: Rodada[] = [];
  for (const conta of c.bills ?? [])
    for (const cesta of conta.order_baskets ?? []) {
      if (cesta.canceled_at || cesta.order_status === "canceled") continue;
      const itens = (cesta.orders ?? [])
        .filter((p) => !p.canceled_at)
        .map((p) => ({
          nome: p.product?.name?.trim() || "Item",
          qtd: p.amount,
          obs: p.details?.trim() || null,
          complementos: [] as string[],
        }));
      if (itens.length) rodadas.push({ em: cesta.start_time, garcom: conta.waiter?.name ?? null, itens });
    }
  rodadas.sort((a, b) => ms(a.em) - ms(b.em));
  const ultimo = rodadas.length ? rodadas[rodadas.length - 1].em : c.start_time;
  const semPedirHa = min(ms(ultimo), agora);
  const balcao = c.table?.table_type === "balcony";
  return {
    id: c.id,
    rotulo: balcao ? "Balcão" : `Mesa ${c.table?.table_number ?? "?"}`,
    balcao,
    inicio: c.start_time,
    abertaHa: min(ms(c.start_time), agora),
    ultimoPedido: ultimo,
    semPedirHa,
    parada: semPedirHa >= LIMITE_MESA_MIN,
    consumo: num(c.total_price),
    garcons: [...new Set((c.bills ?? []).map((b) => b.waiter?.name).filter((n): n is string => Boolean(n)))],
    clientes: [...new Set((c.bills ?? []).map((b) => b.buyer?.name?.trim()).filter((n): n is string => Boolean(n)))],
    rodadas,
    qtdItens: rodadas.reduce((s, r) => s + r.itens.reduce((t, i) => t + i.qtd, 0), 0),
  };
}

export type PainelMesas = {
  abertas: Mesa[];
  paradas: number;
  consumoAberto: number;
  fechadasHoje: number;
  recebidoHoje: number;
  ticketMedio: number | null;
  permanenciaMedia: number | null;
};

export function painelMesas(comandas: Comanda[], agora: number): PainelMesas {
  const inicioDia = inicioDoServico(agora);
  const salao = comandas.filter((c) => !ehDelivery(c));
  const abertas = salao
    .filter(aberta)
    .map((c) => mesaDe(c, agora))
    // alerta primeiro; depois pelo número da mesa
    .sort((a, b) => Number(b.parada) - Number(a.parada) || a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true }));

  const fechadas = salao.filter((c) => !aberta(c) && !cancelada(c) && ms(c.start_time) >= inicioDia);
  const recebido = fechadas.reduce((s, c) => {
    const pago = (c.payments ?? []).reduce((t, p) => t + num(p.payment_value), 0);
    return s + Math.min(pago || num(c.total_price), num(c.total_price));
  }, 0);
  const permanencias = fechadas
    .map((c) => min(ms(c.start_time), ms(c.end_time || c.completed_at)))
    .filter((m) => m > 0);

  return {
    abertas,
    paradas: abertas.filter((m) => m.parada).length,
    consumoAberto: abertas.reduce((s, m) => s + m.consumo, 0),
    fechadasHoje: fechadas.length,
    recebidoHoje: recebido,
    ticketMedio: fechadas.length ? recebido / fechadas.length : null,
    permanenciaMedia: permanencias.length
      ? Math.round(permanencias.reduce((s, m) => s + m, 0) / permanencias.length)
      : null,
  };
}

/** O instante atual, para as telas do servidor calcularem os tempos. */
export const instanteAtual = () => Date.now();

export const duracao = (minutos: number) =>
  minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;

export const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
