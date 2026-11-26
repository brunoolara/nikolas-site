// A Caixinha do mesmo turno do fechamento de caixa, para a tela /caixa:
// quanto foi repartido entre os funcionários e se já foi pago.

import "server-only";
import { lerDia, lerEquipe } from "@/lib/caixinha/armazem";
import { arredondar, partesDoDia, type ParteDia, type Turno } from "@/lib/caixinha/tipos";

export type CaixinhaDoTurno =
  | { situacao: "paga" | "a-pagar"; valor: number }
  /** Encerrado sem pagar e sem taxa guardada: não dá para saber o valor. */
  | { situacao: "sem-taxa" }
  /** Ainda não foi fechado nem encerrado na Caixinha. */
  | { situacao: "aberta" }
  /** Ninguém marcado nesse turno. */
  | { situacao: "vazia" };

const soma = (partes: ParteDia[], t: Turno) => arredondar(partes.reduce((s, p) => s + p[t], 0));

export async function caixinhaDoTurno(data: string, t: Turno): Promise<CaixinhaDoTurno> {
  const dia = await lerDia(data);
  if (dia.fechamento) return { situacao: "paga", valor: soma(dia.fechamento.partes, t) };
  if (dia.turnoPago?.turno === t) return { situacao: "paga", valor: soma(dia.turnoPago.partes, t) };
  const turno = dia.turnos[t];
  if (turno.encerrado) {
    const taxa = turno.encerrado.taxa;
    if (taxa === null) return { situacao: "sem-taxa" };
    const partes = partesDoDia(dia, { almoco: 0, jantar: 0, [t]: taxa }, await lerEquipe(), [t]);
    return { situacao: "a-pagar", valor: soma(partes, t) };
  }
  return turno.presencas.length ? { situacao: "aberta" } : { situacao: "vazia" };
}
