// Caixinha: a taxa de serviço dividida com a equipe, paga todo dia.
//
// Regras do Nikola's (Bruno, 09/11/2026):
// - 90% da taxa de cada turno vai para a equipe; os 10% restantes ficam com a casa.
// - Almoço e jantar são divididos separados, entre quem trabalhou em cada um.
// - Cada pessoa tem um % no turno (100 = parte cheia, 50 = meia parte). A divisão
//   é proporcional a esse %: o que alguém deixa de receber fica com os outros,
//   e o total pago no turno é sempre os 90%.
// - O consumo do funcionário na casa é descontado cheio; se o dia fechar
//   negativo, o saldo passa para o próximo dia em que a pessoa receber.
// - Sócios não entram (simplesmente não são cadastrados na equipe).
//
// Sem código de servidor aqui: as telas do navegador também usam.

export const PARTE_EQUIPE = 0.9;

export type Turno = "almoco" | "jantar";
export const TURNOS: Turno[] = ["almoco", "jantar"];
export const ROTULO_TURNO: Record<Turno, string> = { almoco: "Almoço", jantar: "Jantar" };

export type Pessoa = { id: string; nome: string; ativo: boolean; criadoEm: string };

/** Quem trabalhou no turno e com quanto da parte (1 a 100). */
export type Presenca = { id: string; pct: number };

export type TurnoDia = {
  presencas: Presenca[];
  /** Taxa digitada à mão. null = usa a da Takeat. */
  taxaManual: number | null;
};

export type Consumo = { id: string; pessoa: string; valor: number; descricao: string; criadoEm: string };

export type LinhaPagamento = {
  pessoa: string;
  nome: string;
  /** Parte da taxa em cada turno. */
  almoco: number;
  jantar: number;
  consumo: number;
  /** Saldo negativo que veio de dias anteriores (0 ou menos). */
  saldoAnterior: number;
  /** almoco + jantar - consumo + saldoAnterior. */
  liquido: number;
  /** O que a pessoa recebe hoje (0 se ficou negativa). */
  pagar: number;
  /** O que passa para o próximo dia (0 ou menos). */
  novoSaldo: number;
};

/** O que cada pessoa ganhou e consumiu num dia, sem saldo (o saldo é do pagamento). */
export type ParteDia = { pessoa: string; nome: string; almoco: number; jantar: number; consumo: number };

/** Um dia fechado: a taxa usada, as partes do dia e o pagamento em que entrou. */
export type Fechamento = {
  em: string;
  por: string;
  taxa: Record<Turno, number>;
  partes: ParteDia[];
  /** Id do pagamento (ver Pagamento). */
  pagamento: string;
};

/**
 * Um pagamento cobre um ou mais dias seguidos (de `ini` a `fim`). As partes
 * dos dias são somadas e o saldo negativo é aplicado uma vez, no total.
 */
export type Pagamento = {
  id: string;
  ini: string;
  fim: string;
  dias: string[];
  em: string;
  por: string;
  linhas: LinhaPagamento[];
  /** Saldos antes deste pagamento, para poder reabrir. */
  saldosAntes: Record<string, number>;
  /** Último dia fechado antes deste pagamento (null se for o primeiro). */
  fechadoAntes: string | null;
};

export const idPagamento = (ini: string, fim: string) => `${ini}_${fim}`;
export const PAGAMENTO_ID = /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/;
/** Um pagamento cobre no máximo isto de dias. */
export const MAX_DIAS_PAGAMENTO = 31;

export type Dia = {
  data: string;
  turnos: Record<Turno, TurnoDia>;
  consumos: Consumo[];
  fechamento?: Fechamento;
};

export type Estado = {
  /** Saldo negativo de cada pessoa (só quem deve aparece). */
  saldos: Record<string, number>;
  /** Último dia fechado; os dias se fecham em ordem. */
  ultimoFechado: string | null;
  /** Ids dos pagamentos feitos, do mais antigo ao mais novo. */
  pagamentos?: string[];
};

export const diaVazio = (data: string): Dia => ({
  data,
  turnos: { almoco: { presencas: [], taxaManual: null }, jantar: { presencas: [], taxaManual: null } },
  consumos: [],
});

const centavos = (v: number) => Math.round(v * 100);
export const arredondar = (v: number) => centavos(v) / 100;

/**
 * Divide 90% da taxa entre os presentes, proporcional ao % de cada um.
 * Trabalha em centavos e entrega os centavos que sobram do arredondamento
 * para as maiores frações, para a soma bater exatamente com os 90%.
 */
export function repartir(taxa: number, presencas: Presenca[]): Map<string, number> {
  const resultado = new Map<string, number>();
  const validas = presencas.filter((p) => p.pct > 0);
  const soma = validas.reduce((s, p) => s + p.pct, 0);
  const bolo = centavos(Math.max(0, taxa) * PARTE_EQUIPE);
  if (!soma || !bolo) {
    for (const p of presencas) resultado.set(p.id, 0);
    return resultado;
  }
  const partes = validas.map((p) => {
    const exato = (bolo * p.pct) / soma;
    return { id: p.id, base: Math.floor(exato), resto: exato - Math.floor(exato) };
  });
  let sobra = bolo - partes.reduce((s, p) => s + p.base, 0);
  for (const p of [...partes].sort((a, b) => b.resto - a.resto)) {
    if (sobra <= 0) break;
    p.base += 1;
    sobra -= 1;
  }
  for (const p of presencas) resultado.set(p.id, 0);
  for (const p of partes) resultado.set(p.id, p.base / 100);
  return resultado;
}

const porNome = <T extends { nome: string }>(x: T, y: T) => x.nome.localeCompare(y.nome, "pt-BR");

/** As partes de cada pessoa num dia, com as taxas já decididas. */
export function partesDoDia(dia: Dia, taxa: Record<Turno, number>, equipe: Pessoa[]): ParteDia[] {
  const almoco = repartir(taxa.almoco, dia.turnos.almoco.presencas);
  const jantar = repartir(taxa.jantar, dia.turnos.jantar.presencas);
  const consumo = new Map<string, number>();
  for (const c of dia.consumos) consumo.set(c.pessoa, (consumo.get(c.pessoa) ?? 0) + c.valor);

  // entra quem trabalhou e quem consumiu
  const ids = new Set<string>([...almoco.keys(), ...jantar.keys(), ...consumo.keys()]);
  const nome = (id: string) => equipe.find((p) => p.id === id)?.nome ?? "(removido)";
  return [...ids]
    .map((id) => ({
      pessoa: id,
      nome: nome(id),
      almoco: almoco.get(id) ?? 0,
      jantar: jantar.get(id) ?? 0,
      consumo: arredondar(consumo.get(id) ?? 0),
    }))
    .sort(porNome);
}

/**
 * Soma as partes de vários dias e aplica o saldo negativo que cada um trazia:
 * o que a pessoa recebe no pagamento e o que fica devendo depois dele.
 */
export function somarPagamento(dias: ParteDia[][], saldos: Record<string, number>): LinhaPagamento[] {
  const soma = new Map<string, ParteDia>();
  for (const partes of dias)
    for (const p of partes) {
      const s = soma.get(p.pessoa) ?? { ...p, almoco: 0, jantar: 0, consumo: 0 };
      s.almoco += p.almoco;
      s.jantar += p.jantar;
      s.consumo += p.consumo;
      soma.set(p.pessoa, s);
    }
  return [...soma.values()]
    .map((p) => {
      const a = arredondar(p.almoco);
      const j = arredondar(p.jantar);
      const c = arredondar(p.consumo);
      const s = saldos[p.pessoa] ?? 0;
      const liquido = arredondar(a + j - c + s);
      return {
        pessoa: p.pessoa,
        nome: p.nome,
        almoco: a,
        jantar: j,
        consumo: c,
        saldoAnterior: s,
        liquido,
        pagar: Math.max(0, liquido),
        novoSaldo: Math.min(0, liquido),
      };
    })
    .sort(porNome);
}

/** O pagamento de um dia só, pessoa a pessoa. */
export const calcularDia = (dia: Dia, taxa: Record<Turno, number>, equipe: Pessoa[], saldos: Record<string, number>) =>
  somarPagamento([partesDoDia(dia, taxa, equipe)], saldos);

/** Os dias de `ini` a `fim`, inclusive. */
export function diasEntre(ini: string, fim: string): string[] {
  const lista: string[] = [];
  for (let d = ini; d <= fim && lista.length <= 400; ) {
    lista.push(d);
    const [a, m, n] = d.split("-").map(Number);
    d = new Date(Date.UTC(a, m - 1, n + 1)).toISOString().slice(0, 10);
  }
  return lista;
}

export const reais = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
