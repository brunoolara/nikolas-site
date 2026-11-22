// A conta de "Pagar período", usada pela tela e pelo PDF, para os dois
// mostrarem sempre os mesmos valores.

import "server-only";
import { rotuloData } from "@/lib/posts/tipos";
import { lerDia, lerEquipe } from "./armazem";
import { taxasDoPeriodo } from "./takeat";
import {
  diasEntre,
  MAX_DIAS_PAGAMENTO,
  partesDoDia,
  ROTULO_TURNO,
  somarPagamento,
  TURNOS,
  turnoDoConsumo,
  turnosAbertos,
  type Dia,
  type Estado,
  type Turno,
} from "./tipos";

/** "seg, 09/11" — para listas. */
export const curto = (d: string) => rotuloData(d).replace(/^(\S{3})\S*,/, "$1,");

/**
 * Os dias de `ini` a `fim`: a taxa de cada turno, quem trabalhou, o consumo e
 * o que impede de fechar; e o pagamento somado (o saldo negativo conta uma vez).
 */
export async function montarPeriodo(ini: string, fim: string, estado: Estado) {
  const datas = diasEntre(ini, fim);

  const problemas: string[] = [];
  if (datas.length > MAX_DIAS_PAGAMENTO) problemas.push(`Um pagamento cobre no máximo ${MAX_DIAS_PAGAMENTO} dias.`);

  const usados = datas.slice(0, MAX_DIAS_PAGAMENTO);
  const [dias, equipe] = await Promise.all([Promise.all(usados.map(lerDia)), lerEquipe()]);
  const abertos = dias.filter((d) => !d.fechamento);
  const precisam = abertos.filter((d) => turnosAbertos(d).some((t) => d.turnos[t].taxaManual === null)).map((d) => d.data);
  const takeat = precisam.length && !problemas.length ? await taxasDoPeriodo(precisam) : new Map();

  // dia a dia: taxa de cada turno, quem trabalhou e o que impede de fechar
  const resumo = dias.map((d) => {
    const tk = takeat.get(d.data);
    const taxa = {} as Record<Turno, number>;
    const avisos: string[] = [];
    for (const t of TURNOS) {
      // turno já pago à parte: não entra neste pagamento
      if (!d.fechamento && d.turnoPago?.turno === t) {
        taxa[t] = 0;
        continue;
      }
      const manual = d.fechamento ? d.fechamento.taxa[t] : d.turnos[t].taxaManual;
      const ninguem = !d.turnos[t].presencas.some((p) => p.pct > 0);
      taxa[t] = manual ?? (tk?.ok ? tk.taxa[t] : 0);
      if (d.fechamento) continue;
      if (manual === null && !tk?.ok && !ninguem) avisos.push(`${ROTULO_TURNO[t]} sem a taxa da Takeat: digite à mão`);
      if (ninguem && taxa[t] > 0) avisos.push(`${ROTULO_TURNO[t]} com taxa e ninguém marcado`);
    }
    const pagoAntes = d.fechamento ? undefined : d.turnoPago?.turno;
    const pessoas = new Set(TURNOS.flatMap((t) => d.turnos[t].presencas.filter((p) => p.pct > 0).map((p) => p.id))).size;
    const consumo = d.consumos.filter((c) => turnoDoConsumo(c) !== pagoAntes).reduce((s, c) => s + c.valor, 0);
    return {
      dia: d,
      taxa,
      avisos,
      pagoAntes,
      pessoas,
      consumo,
      partes: partesDoDia(d, taxa, equipe, d.fechamento ? TURNOS : turnosAbertos(d)),
    };
  });
  const fechados = resumo.filter((r) => r.dia.fechamento);
  if (fechados.length && !problemas.length)
    problemas.push(`O período tem dia já pago (${fechados.map((r) => curto(r.dia.data)).join(", ")}).`);
  const comAviso = resumo.filter((r) => r.avisos.length);

  const linhas = somarPagamento(
    resumo.map((r) => r.partes),
    estado.saldos,
  );
  const taxaTotal = resumo.reduce((s, r) => s + r.taxa.almoco + r.taxa.jantar, 0);
  const total = linhas.reduce((s, l) => s + l.pagar, 0);
  const podeFechar = !problemas.length && !comAviso.length && datas.length > 0;

  return { datas, problemas, resumo, comAviso, linhas, taxaTotal, total, podeFechar };
}

/** A taxa de cada turno que entrou neste pagamento, num dia dele. */
export function taxasNoPagamento(d: Dia, id: string): Partial<Record<Turno, number>> {
  const tp = d.turnoPago;
  if (tp?.pagamento === id) return { [tp.turno]: tp.taxa };
  if (d.fechamento?.pagamento !== id) return {};
  const t = { ...d.fechamento.taxa } as Partial<Record<Turno, number>>;
  if (tp) delete t[tp.turno];
  return t;
}
