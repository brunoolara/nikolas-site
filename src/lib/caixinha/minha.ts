// "Minha caixinha": o que um funcionário vê da própria caixinha, no login dele.
//
// Regras (Bruno, 12/11/2026):
// - Só os turnos em que a pessoa estava presente, dos últimos 60 dias.
// - Em cada turno, o total da taxa do turno e a parte dela.
// - Os turnos ainda abertos aparecem (sem a palavra "prévia"), com o aviso de
//   que o valor pode mudar até o fechamento.
// - O consumo dela aparece, mesmo em dia de folga.
//
// Quem é a pessoa vem da sessão (o login ligado a alguém da equipe), nunca do
// endereço. Tudo é filtrado aqui no servidor: nome, parte e consumo dos
// colegas não saem daqui.

import "server-only";
import { lerDia, lerEquipe, lerEstado, lerPagamento } from "./armazem";
import { taxasDoPeriodo } from "./takeat";
import { hoje, somarDias } from "@/lib/posts/tipos";
import {
  diasEntre,
  partesDoDia,
  repartir,
  somarPagamento,
  TURNOS,
  turnoDoConsumo,
  turnosAbertos,
  type Dia,
  type LinhaPagamento,
  type ParteDia,
  type Pessoa,
  type Turno,
} from "./tipos";

export const DIAS_MINHA = 60;

export type MeuTurno = {
  turno: Turno;
  /** Taxa do turno inteiro; null = ainda sem a taxa da Takeat. */
  taxa: number | null;
  parte: number;
  /** % da parte (100 = parte cheia). */
  pct: number;
  /** Id do pagamento em que entrou; null = ainda aberto. */
  pagamento: string | null;
};

export type MeuConsumo = { id: string; descricao: string; valor: number; turno: Turno; aberto: boolean };

export type MeuDia = { data: string; turnos: MeuTurno[]; consumos: MeuConsumo[] };

export type MeuPagamento = { id: string; ini: string; fim: string; turno?: Turno; em: string; recebeu: number };

export type MinhaCaixinha = {
  nome: string;
  ini: string;
  fim: string;
  /** Do mais novo ao mais antigo, só os dias com turno trabalhado ou consumo. */
  dias: MeuDia[];
  /** O que a pessoa tem a receber dos turnos abertos (já com consumo e saldo). */
  aberto: LinhaPagamento | null;
  /** Saldo negativo que ela carrega (0 ou menos). */
  saldo: number;
  /** Do mais novo ao mais antigo. */
  pagamentos: MeuPagamento[];
};

type TaxaAberta = (dia: Dia, turno: Turno) => number | null;

/**
 * Monta a visão de uma pessoa a partir dos dias. Sem leitura nenhuma: as
 * taxas dos turnos abertos chegam prontas em `taxaAberta`.
 */
export function montarMinha(
  pessoa: string,
  dias: Dia[],
  equipe: Pessoa[],
  saldos: Record<string, number>,
  taxaAberta: TaxaAberta,
): Omit<MinhaCaixinha, "pagamentos" | "ini" | "fim"> & { idsPagamentos: string[] } {
  const meus: MeuDia[] = [];
  const ids = new Set<string>();
  const partesAbertas: ParteDia[][] = [];

  for (const d of dias) {
    const abertos = turnosAbertos(d);
    const tp = d.turnoPago;
    const turnos: MeuTurno[] = [];
    for (const t of TURNOS) {
      const pct = d.turnos[t].presencas.find((p) => p.id === pessoa)?.pct ?? 0;
      if (pct <= 0) continue;
      let taxa: number | null;
      let parte: number;
      let pagamento: string | null;
      if (abertos.includes(t)) {
        taxa = taxaAberta(d, t);
        parte = repartir(taxa ?? 0, d.turnos[t].presencas).get(pessoa) ?? 0;
        pagamento = null;
      } else if (tp?.turno === t) {
        taxa = tp.taxa;
        parte = tp.partes.find((p) => p.pessoa === pessoa)?.[t] ?? 0;
        pagamento = tp.pagamento;
      } else {
        taxa = d.fechamento!.taxa[t];
        parte = d.fechamento!.partes.find((p) => p.pessoa === pessoa)?.[t] ?? 0;
        pagamento = d.fechamento!.pagamento;
      }
      if (pagamento) ids.add(pagamento);
      turnos.push({ turno: t, taxa, parte, pct, pagamento });
    }
    const consumos = d.consumos
      .filter((c) => c.pessoa === pessoa)
      .map((c) => ({
        id: c.id,
        descricao: c.descricao,
        valor: c.valor,
        turno: turnoDoConsumo(c),
        aberto: abertos.includes(turnoDoConsumo(c)),
      }));
    for (const c of consumos)
      if (!c.aberto) {
        const t = c.turno;
        const pag = tp?.turno === t ? tp.pagamento : d.fechamento?.pagamento;
        if (pag) ids.add(pag);
      }
    if (turnos.length || consumos.length) meus.push({ data: d.data, turnos, consumos });

    if (abertos.length) {
      const taxa: Record<Turno, number> = { almoco: 0, jantar: 0 };
      for (const t of abertos) taxa[t] = taxaAberta(d, t) ?? 0;
      partesAbertas.push(partesDoDia(d, taxa, equipe, abertos).filter((p) => p.pessoa === pessoa));
    }
  }

  const aberto = somarPagamento(partesAbertas, { [pessoa]: saldos[pessoa] ?? 0 }).find((l) => l.pessoa === pessoa);
  return {
    nome: equipe.find((p) => p.id === pessoa)?.nome ?? "",
    dias: meus.sort((a, b) => b.data.localeCompare(a.data)),
    aberto: aberto && (aberto.almoco || aberto.jantar || aberto.consumo) ? aberto : null,
    saldo: saldos[pessoa] ?? 0,
    idsPagamentos: [...ids],
  };
}

/** A caixinha de uma pessoa nos últimos 60 dias, lida da loja. */
export async function lerMinhaCaixinha(pessoa: string): Promise<MinhaCaixinha> {
  const fim = hoje();
  const ini = somarDias(fim, -(DIAS_MINHA - 1));
  const [dias, equipe, estado] = await Promise.all([Promise.all(diasEntre(ini, fim).map(lerDia)), lerEquipe(), lerEstado()]);

  // a taxa da Takeat só dos turnos abertos em que a pessoa trabalhou e que não têm taxa digitada
  const precisam = dias
    .filter((d) =>
      turnosAbertos(d).some(
        (t) => d.turnos[t].taxaManual === null && d.turnos[t].presencas.some((p) => p.id === pessoa && p.pct > 0),
      ),
    )
    .map((d) => d.data);
  const takeat = precisam.length ? await taxasDoPeriodo(precisam) : new Map();
  const taxaAberta: TaxaAberta = (d, t) => {
    const manual = d.turnos[t].taxaManual;
    if (manual !== null) return manual;
    const tk = takeat.get(d.data);
    return tk?.ok ? tk.taxa[t] : null;
  };

  const { idsPagamentos, ...resto } = montarMinha(pessoa, dias, equipe, estado.saldos, taxaAberta);
  const pagamentos = (await Promise.all(idsPagamentos.map(lerPagamento)))
    .map((p) => {
      const linha = p?.linhas.find((l) => l.pessoa === pessoa);
      return p && linha
        ? { id: p.id, ini: p.ini, fim: p.fim, ...(p.turno ? { turno: p.turno } : {}), em: p.em, recebeu: linha.pagar }
        : null;
    })
    .filter((p): p is MeuPagamento => Boolean(p))
    .sort((a, b) => b.em.localeCompare(a.em));
  return { ...resto, ini, fim, pagamentos };
}
