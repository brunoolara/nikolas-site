// Comandas da Takeat (GET /v1/table-sessions): a fonte de mesas, delivery,
// caixinha e faturamento. A rota aceita no máximo 3 dias por consulta.
//
// Duas formas de ler:
// - comandasAoVivo(): ontem e hoje, guardadas por 2 minutos num arquivo que
//   todos os celulares abertos compartilham. Fora do horário da casa não
//   consulta a Takeat (mostra a última leitura).
// - comandasDoPeriodo(): qualquer período, em fatias de 3 dias numa grade
//   fixa. Fatia antiga fica guardada para sempre; a que tem hoje vale 10 min.
//
// Guardamos só os campos que as telas usam (sem dados fiscais).

import "server-only";
import { get, put } from "@vercel/blob";
import { turnosDoDia } from "@/data/restaurante";
import { takeatGet, type Prioridade } from "./cliente";

export type Pedido = {
  id: number;
  amount: number;
  price: string;
  total_price: string;
  canceled_at: string | null;
  details: string | null;
  product: { id: number; name: string } | null;
  complement_categories?: {
    order_complements?: { complement_id: number; amount: number; complement?: { name: string } }[];
  }[];
};

export type Cesta = {
  id: number;
  order_status: string;
  start_time: string;
  canceled_at: string | null;
  orders: Pedido[];
};

export type Conta = {
  id: number;
  buyer: {
    name: string | null;
    phone: string | null;
    delivery_address?: Record<string, string | null> | null;
  } | null;
  waiter: { name: string } | null;
  order_baskets: Cesta[];
};

export type Comanda = {
  id: number;
  status: string;
  start_time: string;
  end_time: string | null;
  completed_at: string | null;
  is_delivery: boolean;
  with_withdrawal: boolean | null;
  delivery_canceled_at: string | null;
  scheduled_to: string | null;
  attendance_password: number | null;
  sales_channel: string | null;
  ifood_document?: unknown;
  total_price: string;
  total_service_price: string;
  total_delivery_price: string | null;
  delivery_tax_price: string | null;
  discount_total: string | null;
  people_at_table: string | null;
  status_timings: {
    accepted_at: string | null;
    ready_at: string | null;
    ongoing_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
  } | null;
  table: { table_number: number | null; table_type: string | null } | null;
  payments: { payment_value: string; payment_method?: { name?: string; keyword?: string } | null }[];
  bills: Conta[];
};

/** Só os campos que usamos; o resto (fiscal, NFC-e) fica de fora do arquivo. */
function enxugar(c: Comanda): Comanda {
  return {
    id: c.id,
    status: c.status,
    start_time: c.start_time,
    end_time: c.end_time,
    completed_at: c.completed_at,
    is_delivery: c.is_delivery,
    with_withdrawal: c.with_withdrawal,
    delivery_canceled_at: c.delivery_canceled_at,
    scheduled_to: c.scheduled_to,
    attendance_password: c.attendance_password,
    sales_channel: c.sales_channel,
    ifood_document: c.ifood_document ? true : undefined,
    total_price: c.total_price,
    total_service_price: c.total_service_price,
    total_delivery_price: c.total_delivery_price,
    delivery_tax_price: c.delivery_tax_price,
    discount_total: c.discount_total,
    people_at_table: c.people_at_table,
    status_timings: c.status_timings,
    table: c.table,
    payments: (c.payments ?? []).map((p) => ({
      payment_value: p.payment_value,
      payment_method: p.payment_method ? { name: p.payment_method.name, keyword: p.payment_method.keyword } : null,
    })),
    bills: (c.bills ?? []).map((b) => ({
      id: b.id,
      buyer: b.buyer
        ? { name: b.buyer.name, phone: b.buyer.phone, delivery_address: b.buyer.delivery_address ?? null }
        : null,
      waiter: b.waiter ? { name: b.waiter.name } : null,
      order_baskets: (b.order_baskets ?? []).map((k) => ({
        id: k.id,
        order_status: k.order_status,
        start_time: k.start_time,
        canceled_at: k.canceled_at,
        orders: (k.orders ?? []).map((o) => ({
          id: o.id,
          amount: o.amount,
          price: o.price,
          total_price: o.total_price,
          canceled_at: o.canceled_at,
          details: o.details,
          product: o.product ? { id: o.product.id, name: o.product.name } : null,
          complement_categories: (o.complement_categories ?? []).map((cc) => ({
            order_complements: (cc.order_complements ?? []).map((oc) => ({
              complement_id: oc.complement_id,
              amount: oc.amount,
              complement: oc.complement ? { name: oc.complement.name } : undefined,
            })),
          })),
        })),
      })),
    })),
  };
}

const PASTA = process.env.NODE_ENV === "production" ? "takeat" : "takeat-teste";

async function lerJson<T>(caminho: string): Promise<T | null> {
  try {
    const res = await get(caminho, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return (await new Response(res.stream).json()) as T;
  } catch {
    return null;
  }
}

async function gravarJson(caminho: string, valor: unknown) {
  await put(caminho, JSON.stringify(valor), { access: "private", contentType: "application/json", allowOverwrite: true });
}

async function consultar(inicio: string, fim: string, prioridade: Prioridade): Promise<Comanda[]> {
  const corpo = await takeatGet<Comanda[] | { data?: Comanda[] }>(
    "/v1/table-sessions",
    { start_date: inicio, end_date: fim },
    prioridade,
  );
  const lista = Array.isArray(corpo) ? corpo : (corpo.data ?? []);
  return lista.map(enxugar);
}

// ---------------------------------------------------------------- ao vivo

export type AoVivo = { em: string; comandas: Comanda[]; erro?: string; foraDoHorario?: boolean };

const VALIDADE_AO_VIVO = 2 * 60_000;
let emVoo: Promise<AoVivo> | null = null;

/** Casa aberta agora, com folga de 30 min antes e 90 min depois de cada turno. */
export function casaFuncionando(agora = new Date()): boolean {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(agora);
  const pegar = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(pegar("weekday"));
  const min = (Number(pegar("hour")) % 24) * 60 + Number(pegar("minute"));
  const emMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  return turnosDoDia(dia).some(([abre, fecha]) => min >= emMin(abre) - 30 && min <= emMin(fecha) + 90);
}

/** Comandas das últimas 30 h, no máximo a cada 2 min para todo mundo junto. */
export async function comandasAoVivo(forcar = false): Promise<AoVivo> {
  const caminho = `${PASTA}/ao-vivo.json`;
  const guardado = await lerJson<AoVivo>(caminho);
  const idade = guardado ? Date.now() - new Date(guardado.em).getTime() : Infinity;
  if (guardado && idade < VALIDADE_AO_VIVO && !guardado.erro) return guardado;
  if (!forcar && guardado && !casaFuncionando()) return { ...guardado, foraDoHorario: true };

  if (!emVoo)
    emVoo = (async () => {
      try {
        const fim = new Date();
        const inicio = new Date(fim.getTime() - 30 * 3_600_000);
        const comandas = await consultar(inicio.toISOString(), fim.toISOString(), "ao-vivo");
        const novo: AoVivo = { em: fim.toISOString(), comandas };
        await gravarJson(caminho, novo);
        return novo;
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.message : "Não consegui falar com a Takeat agora.";
        return guardado ? { ...guardado, erro: motivo } : { em: new Date().toISOString(), comandas: [], erro: motivo };
      } finally {
        setTimeout(() => (emVoo = null), 0);
      }
    })();
  return emVoo;
}

// ---------------------------------------------------------------- períodos

const DIA = 86_400_000;
/** Grade de 3 dias contada a partir de 01/01/2026 00:00 de Brasília (03:00 UTC). */
const ORIGEM = Date.UTC(2026, 0, 1, 3);

/** Dia "AAAA-MM-DD" → início dele em Brasília, em ms UTC. */
const inicioDoDia = (data: string) => Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), 3);

/**
 * Comandas abertas entre o início de `diaIni` e o fim de `diaFim` (dias de
 * Brasília, inclusive). Fatias antigas vêm do arquivo; só a fatia de hoje vai
 * à Takeat, e no máximo a cada 10 min.
 */
export async function comandasDoPeriodo(
  diaIni: string,
  diaFim: string,
  prioridade: Prioridade = "normal",
): Promise<Comanda[]> {
  const ini = inicioDoDia(diaIni);
  const fim = inicioDoDia(diaFim) + DIA;
  const agora = Date.now();
  const primeira = ORIGEM + Math.floor((ini - ORIGEM) / (3 * DIA)) * 3 * DIA;

  const todas: Comanda[] = [];
  for (let fatia = primeira; fatia < fim && fatia < agora; fatia += 3 * DIA) {
    const fimFatia = Math.min(fatia + 3 * DIA, agora);
    const caminho = `${PASTA}/comandas/${new Date(fatia).toISOString().slice(0, 10)}.json`;
    const guardada = await lerJson<{ em: string; fechada: boolean; comandas: Comanda[] }>(caminho);
    const valida =
      guardada && (guardada.fechada || agora - new Date(guardada.em).getTime() < 10 * 60_000);
    let comandas = guardada?.comandas ?? [];
    if (!valida) {
      comandas = await consultar(new Date(fatia).toISOString(), new Date(fimFatia).toISOString(), prioridade);
      // fatia que acabou há mais de um dia não muda mais
      await gravarJson(caminho, { em: new Date().toISOString(), fechada: fatia + 4 * DIA < agora, comandas });
    }
    todas.push(...comandas);
  }
  return todas.filter((c) => {
    const t = new Date(c.start_time).getTime();
    return t >= ini && t < fim;
  });
}
