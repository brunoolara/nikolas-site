// Taxa de serviço do dia, lida da Takeat pelo cliente comum (lib/takeat),
// que cuida da chave, do token e da cota diária. A Caixinha tem prioridade
// "essencial": é a última a ficar sem cota.
//
// A taxa segue a conta da Caixinha do Hawks: de cada comanda paga, o que foi
// pago além do consumo, limitado ao total com serviço. Ficam fora comandas
// canceladas, delivery e as que ainda não têm pagamento. O turno é o da
// ABERTURA da mesa (start_time): mesa aberta no almoço fica inteira no almoço.

import "server-only";
import { mensagemDe, takeatGet } from "@/lib/takeat/cliente";
import type { Comanda } from "@/lib/takeat/comandas";
import { arredondar, type Turno } from "./tipos";

/** Mesa aberta a partir desta hora (horário de Ouro Fino) é jantar. */
const INICIO_JANTAR = 17 * 60;
/** Até esta hora da madrugada a mesa ainda conta como jantar do dia anterior. */
const FIM_MADRUGADA = 6 * 60;

export type TaxaTakeat =
  | { ok: true; taxa: Record<Turno, number>; comandas: Record<Turno, number> }
  | { ok: false; motivo: string };

/** "AAAA-MM-DD" e minutos do dia, no horário de Ouro Fino. */
function horaLocal(iso: string): { data: string; minutos: number } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d))
    p[x.type] = x.value;
  const hora = p.hour === "24" ? 0 : Number(p.hour);
  return { data: `${p.year}-${p.month}-${p.day}`, minutos: hora * 60 + Number(p.minute) };
}

function somarDias(data: string, n: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Em que dia e turno da Caixinha cai uma mesa aberta neste horário. */
function classificar(iso: string): { data: string; turno: Turno } | null {
  const l = horaLocal(iso);
  if (!l) return null;
  if (l.minutos < FIM_MADRUGADA) return { data: somarDias(l.data, -1), turno: "jantar" };
  return { data: l.data, turno: l.minutos >= INICIO_JANTAR ? "jantar" : "almoco" };
}

function taxaDaComanda(c: Comanda): number {
  if (c.status === "canceled" || c.delivery_canceled_at || c.is_delivery) return 0;
  const pagamentos = c.payments ?? [];
  if (!pagamentos.length) return 0;
  const pago = pagamentos.reduce((s, p) => s + (Number(p.payment_value) || 0), 0);
  const consumo = Number(c.total_price) || 0;
  const comServico = Number(c.total_service_price) || consumo;
  return Math.max(0, Math.min(pago, comServico) - consumo);
}

// Cada clique na Caixinha redesenha a página, então a taxa de cada dia fica
// guardada por alguns minutos: hoje e ontem mudam (mesas ainda abertas),
// dias mais antigos quase nunca.
const guardadas = new Map<string, { em: number; taxa: TaxaTakeat }>();
const MINUTO = 60_000;

/** A taxa de serviço de cada turno do dia `data` ("AAAA-MM-DD"). */
export async function taxaDoDia(data: string, fresca = false): Promise<TaxaTakeat> {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const validade = data >= somarDias(hoje, -1) ? 3 * MINUTO : 60 * MINUTO;
  const guardada = guardadas.get(data);
  if (!fresca && guardada?.taxa.ok && Date.now() - guardada.em < validade) return guardada.taxa;

  const taxa = await consultar(data);
  if (taxa.ok) guardadas.set(data, { em: Date.now(), taxa });
  return taxa;
}

async function consultar(data: string): Promise<TaxaTakeat> {
  try {
    // do começo do dia até as 6h do dia seguinte, em horário de Ouro Fino
    // (UTC-3), sem passar de agora: a Takeat não aceita fim no futuro
    const fim = new Date(Math.min(Date.parse(`${somarDias(data, 1)}T09:00:00Z`), Date.now())).toISOString();
    const corpo = await takeatGet<Comanda[] | { data?: Comanda[] }>(
      "/v1/table-sessions",
      { start_date: `${data}T03:00:00Z`, end_date: fim },
      "essencial",
    );
    const comandas = Array.isArray(corpo) ? corpo : (corpo.data ?? []);

    const taxa: Record<Turno, number> = { almoco: 0, jantar: 0 };
    const quantas: Record<Turno, number> = { almoco: 0, jantar: 0 };
    for (const c of comandas) {
      const valor = taxaDaComanda(c);
      if (!valor || !c.start_time) continue;
      const lugar = classificar(c.start_time);
      if (!lugar || lugar.data !== data) continue;
      taxa[lugar.turno] += valor;
      quantas[lugar.turno] += 1;
    }
    return {
      ok: true,
      taxa: { almoco: arredondar(taxa.almoco), jantar: arredondar(taxa.jantar) },
      comandas: quantas,
    };
  } catch (erro) {
    console.error("caixinha: falha ao ler a Takeat", erro instanceof Error ? erro.message : erro);
    return { ok: false, motivo: mensagemDe(erro) };
  }
}
