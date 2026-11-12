"use server";

// Tudo que muda a Caixinha. Quem tem a área "caixinha" mexe; dia fechado não
// muda mais até ser reaberto. Os dias se fecham num pagamento (um dia só ou
// um período) e se fecham e reabrem em ordem, porque o saldo passa adiante.
// Um turno também pode ser pago sozinho; aí só o outro turno segue aberto, e
// pagar o outro fecha o dia. Só o último pagamento feito pode ser reaberto.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import { DATA, hoje, rotuloData } from "@/lib/posts/tipos";
import {
  apagarPagamento,
  atualizarDia,
  atualizarEquipe,
  gravarEstado,
  gravarPagamento,
  lerDia,
  lerEquipe,
  lerEstado,
  lerPagamento,
} from "@/lib/caixinha/armazem";
import { taxasDoPeriodo, type TaxaTakeat } from "@/lib/caixinha/takeat";
import {
  arredondar,
  diasEntre,
  idPagamento,
  juntarPartes,
  MAX_DIAS_PAGAMENTO,
  PAGAMENTO_ID,
  partesDoDia,
  ROTULO_TURNO,
  somarPagamento,
  TURNOS,
  turnoDoConsumo,
  turnosAbertos,
  type Dia,
  type Estado,
  type Turno,
} from "@/lib/caixinha/tipos";

const FALHA = "Não consegui gravar. Tente de novo em instantes.";

async function quem(): Promise<string | null> {
  const sessao = await sessaoAtual();
  return sessao?.areas.includes("caixinha") ? sessao.nome : null;
}

const turnoValido = (t: string): t is Turno => (TURNOS as string[]).includes(t);

/** Muda um dia aberto. Com `turno`, recusa se aquele turno já foi pago. */
async function mexerNoDia(
  data: string,
  mudar: (dia: Dia) => Dia,
  turno?: Turno | ((dia: Dia) => Turno | undefined),
): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };
  try {
    let fechado = false;
    let pago: Turno | null = null;
    await atualizarDia(data, (dia) => {
      if (dia.fechamento) {
        fechado = true;
        return dia;
      }
      const t = typeof turno === "function" ? turno(dia) : turno;
      if (t && dia.turnoPago?.turno === t) {
        pago = t;
        return dia;
      }
      return mudar(dia);
    });
    if (fechado) return { ok: false, mensagem: "Este dia já foi fechado. Reabra para mudar." };
    const turnoPago = pago as Turno | null;
    if (turnoPago)
      return { ok: false, mensagem: `O ${ROTULO_TURNO[turnoPago].toLowerCase()} já foi pago. Reabra para mudar.` };
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: "" };
  } catch (erro) {
    console.error("caixinha: falha ao gravar o dia", erro);
    return { ok: false, mensagem: FALHA };
  }
}

/** Marca, muda o % ou (com pct null) tira alguém do turno. */
export async function acaoPresenca(data: string, turno: string, pessoa: string, pct: number | null) {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  if (pct !== null && !(Number.isFinite(pct) && pct >= 1 && pct <= 100))
    return { ok: false, mensagem: "O % vai de 1 a 100." };
  return mexerNoDia(data, (dia) => {
    const lista = dia.turnos[turno].presencas.filter((p) => p.id !== pessoa);
    if (pct !== null) lista.push({ id: pessoa, pct: Math.round(pct) });
    return { ...dia, turnos: { ...dia.turnos, [turno]: { ...dia.turnos[turno], presencas: lista } } };
  }, turno);
}

/** Põe no turno todos os ativos que ainda não estão, com 100%. */
export async function acaoTodosPresentes(data: string, turno: string) {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  const equipe = (await lerEquipe()).filter((p) => p.ativo);
  return mexerNoDia(data, (dia) => {
    const atuais = dia.turnos[turno].presencas;
    const novos = equipe.filter((p) => !atuais.some((a) => a.id === p.id)).map((p) => ({ id: p.id, pct: 100 }));
    return {
      ...dia,
      turnos: { ...dia.turnos, [turno]: { ...dia.turnos[turno], presencas: [...atuais, ...novos] } },
    };
  }, turno);
}

/** Taxa do turno digitada à mão; null volta a usar a da Takeat. */
export async function acaoTaxaManual(data: string, turno: string, valor: number | null) {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  if (valor !== null && !(Number.isFinite(valor) && valor >= 0)) return { ok: false, mensagem: "Valor inválido." };
  return mexerNoDia(data, (dia) => ({
    ...dia,
    turnos: { ...dia.turnos, [turno]: { ...dia.turnos[turno], taxaManual: valor === null ? null : arredondar(valor) } },
  }), turno);
}

export async function acaoAdicionarConsumo(data: string, pessoa: string, valor: number, descricao: string, turno: string) {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Escolha o turno do consumo." };
  if (!(Number.isFinite(valor) && valor > 0)) return { ok: false, mensagem: "Coloque o valor do consumo." };
  const equipe = await lerEquipe();
  if (!equipe.some((p) => p.id === pessoa)) return { ok: false, mensagem: "Escolha quem consumiu." };
  return mexerNoDia(data, (dia) => ({
    ...dia,
    consumos: [
      ...dia.consumos,
      {
        id: randomUUID(),
        pessoa,
        valor: arredondar(valor),
        descricao: descricao.trim(),
        criadoEm: new Date().toISOString(),
        turno,
      },
    ],
  }), turno);
}

export async function acaoRemoverConsumo(data: string, id: string) {
  return mexerNoDia(
    data,
    (dia) => ({ ...dia, consumos: dia.consumos.filter((c) => c.id !== id) }),
    (dia) => {
      const c = dia.consumos.find((x) => x.id === id);
      return c ? turnoDoConsumo(c) : undefined;
    },
  );
}

/**
 * A taxa de cada turno de cada dia, como vai no fechamento: a digitada, senão
 * a da Takeat; turno sem ninguém e sem taxa fica com zero. Só olha os turnos
 * que vão ser pagos (os outros ficam com zero). Devolve o motivo se algum dia
 * não puder fechar.
 */
async function taxasParaFechar(
  dias: Dia[],
  turnosDe: (dia: Dia) => Turno[] = turnosAbertos,
): Promise<{ ok: true; taxas: Map<string, Record<Turno, number>> } | { ok: false; mensagem: string }> {
  const precisam = dias.filter((d) => turnosDe(d).some((t) => d.turnos[t].taxaManual === null)).map((d) => d.data);
  // no fechamento hoje e ontem são buscados de novo, sem a memória de alguns minutos
  const takeat = precisam.length ? await taxasDoPeriodo(precisam, true) : new Map<string, TaxaTakeat>();
  const taxas = new Map<string, Record<Turno, number>>();
  for (const dia of dias) {
    const tk = takeat.get(dia.data);
    const taxa: Record<Turno, number> = { almoco: 0, jantar: 0 };
    for (const t of turnosDe(dia)) {
      const manual = dia.turnos[t].taxaManual;
      const ninguem = !dia.turnos[t].presencas.some((p) => p.pct > 0);
      const quando = `${ROTULO_TURNO[t]} de ${rotuloData(dia.data)}`;
      if (manual !== null) taxa[t] = manual;
      else if (tk?.ok) taxa[t] = tk.taxa[t];
      // turno sem ninguém (domingo à noite, por exemplo) não precisa de taxa
      else if (ninguem) taxa[t] = 0;
      else
        return {
          ok: false,
          mensagem: `${quando}: sem a taxa da Takeat (${tk && !tk.ok ? tk.motivo : "sem resposta"}). Digite a taxa à mão nesse dia.`,
        };
      if (ninguem && taxa[t] > 0)
        return { ok: false, mensagem: `${quando} teve taxa e ninguém marcado. Marque quem trabalhou antes de fechar.` };
    }
    taxas.set(dia.data, taxa);
  }
  return { ok: true, taxas };
}

/**
 * Fecha e paga os dias de `ini` a `fim`: congela a taxa e as partes de cada
 * dia, soma tudo num pagamento só e passa os saldos negativos adiante.
 */
export async function acaoFecharPeriodo(ini: string, fim: string): Promise<Resultado> {
  const nome = await quem();
  if (!nome) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!DATA.test(ini) || !DATA.test(fim) || ini > fim) return { ok: false, mensagem: "Período inválido." };
  const datas = diasEntre(ini, fim);
  if (datas.length > MAX_DIAS_PAGAMENTO)
    return { ok: false, mensagem: `Um pagamento cobre no máximo ${MAX_DIAS_PAGAMENTO} dias.` };
  if (fim > hoje()) return { ok: false, mensagem: "O período não pode passar de hoje." };

  try {
    const [dias, estado, equipe] = await Promise.all([Promise.all(datas.map(lerDia)), lerEstado(), lerEquipe()]);
    const jaFechado = dias.find((d) => d.fechamento);
    if (jaFechado) return { ok: false, mensagem: `${rotuloData(jaFechado.data)} já está fechado.` };
    if (estado.ultimoFechado && estado.ultimoFechado >= ini)
      return { ok: false, mensagem: "Já existe um dia fechado depois do início do período. Os dias se fecham em ordem." };

    const r = await taxasParaFechar(dias);
    if (!r.ok) return r;

    const id = idPagamento(ini, fim);
    const em = new Date().toISOString();
    // dia com um turno já pago: entra só o outro turno
    const partes = dias.map((d) => partesDoDia(d, r.taxas.get(d.data)!, equipe, turnosAbertos(d)));
    const linhas = somarPagamento(partes, estado.saldos);
    const saldos = saldosDepois(estado, linhas);

    await gravarPagamento({
      id,
      ini,
      fim,
      dias: datas,
      em,
      por: nome,
      linhas,
      saldosAntes: estado.saldos,
      fechadoAntes: estado.ultimoFechado,
    });
    let corrida = false;
    await Promise.all(
      dias.map((d, i) =>
        atualizarDia(d.data, (atual) => {
          if (atual.fechamento || atual.turnoPago?.pagamento !== d.turnoPago?.pagamento) {
            corrida = true;
            return atual;
          }
          const tp = atual.turnoPago;
          const taxa = { ...r.taxas.get(d.data)! };
          if (tp) taxa[tp.turno] = tp.taxa;
          return {
            ...atual,
            fechamento: { em, por: nome, taxa, partes: tp ? juntarPartes(tp.partes, partes[i]) : partes[i], pagamento: id },
          };
        }),
      ),
    );
    if (corrida) return { ok: false, mensagem: "Alguém fechou um destes dias agora há pouco. Confira antes de pagar." };
    await gravarEstado({
      saldos,
      ultimoFechado: fim,
      pagamentos: [...(estado.pagamentos ?? []).filter((p) => p !== id), id],
    });
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: datas.length === 1 ? "Dia fechado." : `${datas.length} dias fechados e pagos.` };
  } catch (erro) {
    console.error("caixinha: falha ao fechar", erro);
    return { ok: false, mensagem: FALHA };
  }
}

export async function acaoFecharDia(data: string): Promise<Resultado> {
  return acaoFecharPeriodo(data, data);
}

const saldosDepois = (estado: Estado, linhas: ReturnType<typeof somarPagamento>) => {
  const saldos = { ...estado.saldos };
  for (const l of linhas) {
    if (l.novoSaldo < 0) saldos[l.pessoa] = l.novoSaldo;
    else delete saldos[l.pessoa];
  }
  return saldos;
};

/**
 * Fecha e paga um turno sozinho: congela a taxa e as partes do turno e o
 * consumo lançado nele. Se o outro turno já foi pago, fecha o dia.
 */
export async function acaoFecharTurno(data: string, turno: string): Promise<Resultado> {
  const nome = await quem();
  if (!nome) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  if (data > hoje()) return { ok: false, mensagem: "Não dá para pagar um dia que ainda não chegou." };

  try {
    const [dia, estado, equipe] = await Promise.all([lerDia(data), lerEstado(), lerEquipe()]);
    if (dia.fechamento) return { ok: false, mensagem: "Este dia já foi fechado." };
    if (dia.turnoPago?.turno === turno) return { ok: false, mensagem: `O ${ROTULO_TURNO[turno].toLowerCase()} já foi pago.` };
    // o outro turno já foi pago: este é o resto do dia
    if (dia.turnoPago) return acaoFecharPeriodo(data, data);
    if (estado.ultimoFechado && estado.ultimoFechado >= data)
      return { ok: false, mensagem: "Já existe um dia fechado depois deste. Os dias se fecham em ordem." };

    const r = await taxasParaFechar([dia], () => [turno]);
    if (!r.ok) return r;
    const taxa = r.taxas.get(data)!;
    const partes = partesDoDia(dia, taxa, equipe, [turno]);
    const linhas = somarPagamento([partes], estado.saldos);
    const id = idPagamento(data, data, turno);
    const em = new Date().toISOString();

    await gravarPagamento({
      id,
      ini: data,
      fim: data,
      dias: [data],
      em,
      por: nome,
      linhas,
      saldosAntes: estado.saldos,
      fechadoAntes: estado.ultimoFechado,
      turno,
    });
    let corrida = false;
    await atualizarDia(data, (atual) => {
      if (atual.fechamento || atual.turnoPago) {
        corrida = true;
        return atual;
      }
      return { ...atual, turnoPago: { turno, em, por: nome, taxa: taxa[turno], partes, pagamento: id } };
    });
    if (corrida) {
      await apagarPagamento(id);
      return { ok: false, mensagem: "Alguém pagou este dia agora há pouco. Confira antes de pagar." };
    }
    await gravarEstado({
      saldos: saldosDepois(estado, linhas),
      ultimoFechado: estado.ultimoFechado,
      pagamentos: [...(estado.pagamentos ?? []).filter((p) => p !== id), id],
    });
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: `${ROTULO_TURNO[turno]} fechado e pago.` };
  } catch (erro) {
    console.error("caixinha: falha ao fechar o turno", erro);
    return { ok: false, mensagem: FALHA };
  }
}

/** Reabre o último pagamento: todos os dias dele voltam a abrir e os saldos voltam ao que eram. */
export async function acaoReabrirPagamento(id: string): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!PAGAMENTO_ID.test(id)) return { ok: false, mensagem: "Pagamento inválido." };
  try {
    const [pag, estado] = await Promise.all([lerPagamento(id), lerEstado()]);
    if (!pag) return { ok: true, mensagem: "" };
    const ultimo = estado.pagamentos?.at(-1);
    if (ultimo ? ultimo !== id : estado.ultimoFechado !== pag.fim)
      return { ok: false, mensagem: "Só dá para reabrir o último pagamento. Reabra os pagamentos depois dele antes." };
    await Promise.all(
      pag.dias.map((d) =>
        atualizarDia(d, (atual) => {
          const copia = { ...atual };
          // pagamento de turno: só o turno volta a abrir; o turno pago antes continua pago
          if (pag.turno) {
            if (copia.turnoPago?.pagamento === id) delete copia.turnoPago;
          } else delete copia.fechamento;
          return copia;
        }),
      ),
    );
    await gravarEstado({
      saldos: pag.saldosAntes,
      ultimoFechado: pag.turno ? estado.ultimoFechado : pag.fechadoAntes,
      pagamentos: (estado.pagamentos ?? []).filter((p) => p !== id),
    });
    await apagarPagamento(id);
    revalidatePath("/caixinha", "layout");
    return {
      ok: true,
      mensagem: pag.turno
        ? `${ROTULO_TURNO[pag.turno]} reaberto.`
        : pag.dias.length === 1
          ? "Dia reaberto."
          : `${pag.dias.length} dias reabertos.`,
    };
  } catch (erro) {
    console.error("caixinha: falha ao reabrir", erro);
    return { ok: false, mensagem: FALHA };
  }
}

/** Reabre o dia, junto com os outros dias do mesmo pagamento. */
export async function acaoReabrirDia(data: string): Promise<Resultado> {
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };
  const dia = await lerDia(data);
  const id = dia.fechamento?.pagamento ?? dia.turnoPago?.pagamento;
  if (!id) return { ok: true, mensagem: "" };
  return acaoReabrirPagamento(id);
}

export async function acaoAdicionarPessoa(nome: string): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (!limpo) return { ok: false, mensagem: "Coloque o nome." };
  try {
    let repetido = false;
    await atualizarEquipe((equipe) => {
      if (equipe.some((p) => p.nome.toLowerCase() === limpo.toLowerCase())) {
        repetido = true;
        return equipe;
      }
      return [...equipe, { id: randomUUID(), nome: limpo, ativo: true, criadoEm: new Date().toISOString() }];
    });
    if (repetido) return { ok: false, mensagem: "Já existe alguém com esse nome." };
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: `${limpo} entrou na equipe.` };
  } catch (erro) {
    console.error("caixinha: falha ao gravar a equipe", erro);
    return { ok: false, mensagem: FALHA };
  }
}

export async function acaoAlterarPessoa(id: string, mudanca: { nome?: string; ativo?: boolean }): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const nome = mudanca.nome?.trim().replace(/\s+/g, " ");
  if (mudanca.nome !== undefined && !nome) return { ok: false, mensagem: "Coloque o nome." };
  try {
    await atualizarEquipe((equipe) =>
      equipe.map((p) =>
        p.id === id ? { ...p, ...(nome ? { nome } : {}), ...(mudanca.ativo !== undefined ? { ativo: mudanca.ativo } : {}) } : p,
      ),
    );
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: "Salvo." };
  } catch (erro) {
    console.error("caixinha: falha ao gravar a equipe", erro);
    return { ok: false, mensagem: FALHA };
  }
}
