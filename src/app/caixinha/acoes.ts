"use server";

// Tudo que muda a Caixinha. Quem tem a área "caixinha" mexe; dia fechado não
// muda mais até ser reaberto. Os dias se fecham num pagamento (um dia só ou
// um período). Desde 15/11/2026 um dia ou turno esquecido pode ser fechado
// depois de dias mais novos (pago hoje o que ficou de ontem): o saldo
// negativo é descontado no pagamento que for feito primeiro. Reabrir segue
// em ordem de pagamento: só o último feito.
// Um turno também pode ser pago sozinho; aí só o outro turno segue aberto, e
// pagar o outro fecha o dia. Só o último pagamento feito pode ser reaberto.
//
// A tela do PC do restaurante (área "caixinha-turno") só chega às ações do
// fim do arquivo: marcar presença e pagar o turno de agora, com o dia e o
// turno conferidos aqui pelo relógio.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { avisarFechamento, type Fechamento } from "@/lib/notificacoes/caixinha";
import { curto } from "@/lib/caixinha/periodo";
import { conferirChavePix, resumoChave } from "@/lib/caixinha/pix";
import { registrar } from "@/lib/registro";
import { sessaoAtual } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import { DATA, hoje, rotuloData } from "@/lib/posts/tipos";
import {
  apagarPagamento,
  atualizarDia,
  atualizarEquipe,
  gravarEstado,
  gravarPagamento,
  gravarPixDe,
  lerDia,
  lerEquipe,
  lerEstado,
  lerPagamento,
} from "@/lib/caixinha/armazem";
import { taxasDoPeriodo, type TaxaTakeat } from "@/lib/caixinha/takeat";
import { porNoPc, responsaveis } from "@/lib/caixinha/responsaveis";
import {
  arredondar,
  diasEntre,
  idPagamento,
  juntarPartes,
  MAX_DIAS_PAGAMENTO,
  PAGAMENTO_ID,
  partesDoDia,
  pctPadrao,
  turnoAgora,
  ROTULO_TURNO,
  somarPagamento,
  TURNOS,
  turnoDoConsumo,
  turnosAbertos,
  type Dia,
  type Estado,
  type ParteDia,
  type Turno,
} from "@/lib/caixinha/tipos";

const FALHA = "Não consegui gravar. Tente de novo em instantes.";

/**
 * Avisa no celular quem recebe e quem acompanha o total (lib/notificacoes/caixinha).
 * Depois da resposta: o fechamento não espera, e falha no push não volta para quem fechou.
 */
function avisarDepois(f: Fechamento) {
  after(() => avisarFechamento(f).catch((erro) => console.error("caixinha: falha ao avisar no celular", erro)));
}

/**
 * "Não pago no dia": avisa o que cada um tem a receber dos turnos encerrados
 * e o total a pagar. Usa a taxa guardada no encerramento; sem ela (a Takeat
 * não respondeu e ninguém digitou) não há valor para avisar. O saldo negativo
 * de dias anteriores fica para o pagamento; o consumo do turno já sai.
 */
function avisarNaoPagoDepois(data: string, turnos: Turno[], por: string) {
  after(async () => {
    try {
      const [dia, equipe] = await Promise.all([lerDia(data), lerEquipe()]);
      const taxa: Record<Turno, number> = { almoco: 0, jantar: 0 };
      for (const t of turnos) {
        const guardada = dia.turnos[t].encerrado?.taxa;
        if (guardada == null) {
          console.error(`caixinha: ${t} de ${data} encerrado sem taxa, aviso não enviado`);
          return;
        }
        taxa[t] = guardada;
      }
      const linhas = somarPagamento([partesDoDia(dia, taxa, equipe, turnos)], {});
      await avisarFechamento({
        id: `nao-pago-${data}-${turnos.join("-")}`,
        oQue: `${turnos.length === 1 ? ROTULO_TURNO[turnos[0]] : "Almoço e jantar"} de ${curto(data)}`,
        linhas,
        por,
        situacao: "a-pagar",
        ...(turnos.length === 1 ? { turno: turnos[0] } : {}),
      });
    } catch (erro) {
      console.error("caixinha: falha ao avisar o não pago no celular", erro);
    }
  });
}

const somaPartes = (partes: ParteDia[]) => arredondar(partes.reduce((s, p) => s + p.almoco + p.jantar, 0));

/** "Almoço de qua, 25/11" ou "Almoço e jantar de qua, 25/11": os turnos que tiveram taxa. */
function nomeDoDia(data: string, partes: ParteDia[]): string {
  const turnos = TURNOS.filter((t) => partes.some((p) => p[t] > 0));
  return `${turnos.length === 1 ? ROTULO_TURNO[turnos[0]] : "Almoço e jantar"} de ${curto(data)}`;
}

async function quem(): Promise<string | null> {
  const sessao = await sessaoAtual();
  return sessao?.areas.includes("caixinha") ? sessao.nome : null;
}

/** Quem está no PC do restaurante (ou alguém com a Caixinha inteira). */
async function quemNoPc(): Promise<string | null> {
  const sessao = await sessaoAtual();
  return sessao?.areas.includes("caixinha") || sessao?.areas.includes("caixinha-turno") ? sessao.nome : null;
}

const turnoValido = (t: string): t is Turno => (TURNOS as string[]).includes(t);

/** Muda um dia aberto. Com `turno`, recusa se aquele turno já foi pago. */
async function mexerNoDia(
  data: string,
  mudar: (dia: Dia) => Dia,
  turno?: Turno | ((dia: Dia) => Turno | undefined),
  autorizado: () => Promise<string | null> = quem,
): Promise<Resultado> {
  if (!(await autorizado())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
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
    revalidatePath("/caixinha-turno");
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

/** Põe no turno todos os ativos que ainda não estão, cada um com o % padrão dele. */
export async function acaoTodosPresentes(data: string, turno: string) {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  const equipe = (await lerEquipe()).filter((p) => p.ativo);
  return mexerNoDia(data, (dia) => {
    const atuais = dia.turnos[turno].presencas;
    const novos = equipe.filter((p) => !atuais.some((a) => a.id === p.id)).map((p) => ({ id: p.id, pct: pctPadrao(p, data) }));
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
  return fecharPeriodo(nome, ini, fim);
}

async function fecharPeriodo(nome: string, ini: string, fim: string): Promise<Resultado> {
  if (!DATA.test(ini) || !DATA.test(fim) || ini > fim) return { ok: false, mensagem: "Período inválido." };
  const datas = diasEntre(ini, fim);
  if (datas.length > MAX_DIAS_PAGAMENTO)
    return { ok: false, mensagem: `Um pagamento cobre no máximo ${MAX_DIAS_PAGAMENTO} dias.` };
  if (fim > hoje()) return { ok: false, mensagem: "O período não pode passar de hoje." };

  try {
    const [dias, estado, equipe] = await Promise.all([Promise.all(datas.map(lerDia)), lerEstado(), lerEquipe()]);
    const jaFechado = dias.find((d) => d.fechamento);
    if (jaFechado) return { ok: false, mensagem: `${rotuloData(jaFechado.data)} já está fechado.` };

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
      // fechar um dia antigo não volta o "último dia fechado" para trás
      ultimoFechado: estado.ultimoFechado && estado.ultimoFechado > fim ? estado.ultimoFechado : fim,
      pagamentos: [...(estado.pagamentos ?? []).filter((p) => p !== id), id],
    });
    // um dia só: se um turno já tinha sido pago, este fechamento completou o dia
    const tp = datas.length === 1 ? dias[0].turnoPago : undefined;
    // um dia só com um turno trabalhado e pago na hora: aviso do turno; o resto é acumulado
    const comGente = datas.length === 1 ? turnosAbertos(dias[0]).filter((t) => dias[0].turnos[t].presencas.some((p) => p.pct > 0)) : [];
    const turnoAvulso = comGente.length === 1 && !dias[0].turnos[comGente[0]].encerrado ? comGente[0] : undefined;
    avisarDepois({
      id,
      oQue: datas.length === 1 ? nomeDoDia(ini, partes[0]) : `De ${curto(ini)} a ${curto(fim)}`,
      linhas,
      por: nome,
      ...(turnoAvulso ? { turno: turnoAvulso } : {}),
      ...(tp ? { totalDoDia: somaPartes(juntarPartes(tp.partes, partes[0])) } : {}),
    });
    revalidatePath("/caixinha", "layout");
    revalidatePath("/caixinha-turno");
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
  return fecharTurno(nome, data, turno);
}

async function fecharTurno(nome: string, data: string, turno: string): Promise<Resultado> {
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  if (data > hoje()) return { ok: false, mensagem: "Não dá para pagar um dia que ainda não chegou." };

  try {
    const [dia, estado, equipe] = await Promise.all([lerDia(data), lerEstado(), lerEquipe()]);
    if (dia.fechamento) return { ok: false, mensagem: "Este dia já foi fechado." };
    if (dia.turnoPago?.turno === turno) return { ok: false, mensagem: `O ${ROTULO_TURNO[turno].toLowerCase()} já foi pago.` };
    // o outro turno já foi pago: este é o resto do dia
    if (dia.turnoPago) return fecharPeriodo(nome, data, data);

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
    avisarDepois({
      id,
      oQue: `${ROTULO_TURNO[turno]} de ${curto(data)}`,
      linhas,
      por: nome,
      // turno que tinha ficado sem pagar entra como acumulado
      ...(dia.turnos[turno].encerrado ? {} : { turno }),
    });
    revalidatePath("/caixinha", "layout");
    revalidatePath("/caixinha-turno");
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

/**
 * Cadastra, troca ou (tipo null) tira a chave Pix de alguém da equipe, para
 * quem não tem login. Fica no registro do painel (tipo e final da chave).
 */
export async function acaoPixDaPessoa(id: string, tipo: string | null, chave: string): Promise<Resultado> {
  const sessao = await sessaoAtual();
  if (!sessao?.areas.includes("caixinha")) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const r = tipo === null ? null : conferirChavePix(tipo, chave);
  if (r && !r.ok) return { ok: false, mensagem: r.erro };
  try {
    const pessoa = (await lerEquipe()).find((p) => p.id === id);
    if (!pessoa || !(await gravarPixDe(id, r ? r.pix : null, sessao.nome)))
      return { ok: false, mensagem: "Essa pessoa não está na equipe." };
    after(() =>
      registrar({
        tipo: "pix",
        usuario: sessao.usuario,
        nome: sessao.nome,
        onde: r ? `cadastrou a chave Pix de ${pessoa.nome} (${resumoChave(r.pix)})` : `tirou a chave Pix de ${pessoa.nome}`,
      }),
    );
    revalidatePath("/caixinha", "layout");
    revalidatePath("/perfil");
    return { ok: true, mensagem: r ? "Chave Pix salva." : "Chave Pix tirada." };
  } catch (erro) {
    console.error("caixinha: falha ao gravar a chave Pix", erro);
    return { ok: false, mensagem: FALHA };
  }
}

const pctValido = (v: number | null | undefined) => v == null || (Number.isInteger(v) && v >= 1 && v <= 100);

export async function acaoAlterarPessoa(
  id: string,
  mudanca: { nome?: string; ativo?: boolean; parte?: number | null; parteDomingo?: number | null },
): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const nome = mudanca.nome?.trim().replace(/\s+/g, " ");
  if (mudanca.nome !== undefined && !nome) return { ok: false, mensagem: "Coloque o nome." };
  if (!pctValido(mudanca.parte) || !pctValido(mudanca.parteDomingo))
    return { ok: false, mensagem: "O % vai de 1 a 100." };
  // null tira a regra (volta a 100%, ou ao % de todo dia no domingo)
  const comParte = <T extends { parte?: number; parteDomingo?: number }>(p: T): T => {
    const novo = { ...p };
    for (const k of ["parte", "parteDomingo"] as const) {
      const v = mudanca[k];
      if (v === undefined) continue;
      if (v === null) delete novo[k];
      else novo[k] = v;
    }
    return novo;
  };
  try {
    await atualizarEquipe((equipe) =>
      equipe.map((p) =>
        p.id === id
          ? comParte({ ...p, ...(nome ? { nome } : {}), ...(mudanca.ativo !== undefined ? { ativo: mudanca.ativo } : {}) })
          : p,
      ),
    );
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: "Salvo." };
  } catch (erro) {
    console.error("caixinha: falha ao gravar a equipe", erro);
    return { ok: false, mensagem: FALHA };
  }
}

// ---------------------------------------------------------------- PC do restaurante

const MUDOU_O_TURNO = "O turno mudou desde que a tela abriu. A tela foi atualizada: confira antes de continuar.";
const ENCERRADO = "Este turno já foi encerrado. Para mudar alguma coisa, fale com o Bruno.";

/**
 * Marca ou desmarca alguém no turno de agora, com o % padrão da pessoa. O %
 * de quem já está marcado não muda (ajuste fino é só na tela da Caixinha).
 */
export async function acaoPcPresenca(data: string, turno: string, pessoa: string, presente: boolean): Promise<Resultado> {
  const agora = turnoAgora();
  if (data !== agora.data || turno !== agora.turno) {
    revalidatePath("/caixinha-turno");
    return { ok: false, mensagem: MUDOU_O_TURNO };
  }
  const p = (await lerEquipe()).find((x) => x.id === pessoa && x.ativo);
  if (!p) return { ok: false, mensagem: "Essa pessoa não está na equipe." };
  const t = agora.turno;
  if ((await lerDia(agora.data)).turnos[t].encerrado) {
    revalidatePath("/caixinha-turno");
    return { ok: false, mensagem: ENCERRADO };
  }
  return mexerNoDia(
    agora.data,
    (dia) => {
      // encerrado entre a leitura acima e a gravação: não mexe
      if (dia.turnos[t].encerrado) return dia;
      const lista = dia.turnos[t].presencas;
      const tem = lista.some((x) => x.id === pessoa);
      if (presente === tem) return dia;
      const nova = presente ? [...lista, { id: pessoa, pct: pctPadrao(p, agora.data) }] : lista.filter((x) => x.id !== pessoa);
      return { ...dia, turnos: { ...dia.turnos, [t]: { ...dia.turnos[t], presencas: nova } } };
    },
    t,
    quemNoPc,
  );
}

/**
 * O nome de quem está fechando no PC, conferido contra a lista da tela
 * (equipe e logins). null se não veio ou não está na lista.
 */
async function responsavelNoPc(escolhido: string): Promise<string | null> {
  const sessao = await sessaoAtual();
  if (!sessao || !(sessao.areas.includes("caixinha") || sessao.areas.includes("caixinha-turno"))) return null;
  const nome = (await responsaveis(sessao.usuario)).find((n) => n === escolhido.trim());
  return nome ? porNoPc(nome) : null;
}

const ESCOLHA_O_NOME = "Escolha o seu nome em \"Quem está fechando\" antes de continuar.";

/** Fecha e paga o turno de agora pelo PC do restaurante, no nome de quem escolheu. */
export async function acaoPcPagarTurno(data: string, turno: string, responsavel: string): Promise<Resultado> {
  if (!(await quemNoPc())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const nome = await responsavelNoPc(responsavel);
  if (!nome) return { ok: false, mensagem: ESCOLHA_O_NOME };
  const agora = turnoAgora();
  if (data !== agora.data || turno !== agora.turno) {
    revalidatePath("/caixinha-turno");
    return { ok: false, mensagem: MUDOU_O_TURNO };
  }
  // encerrado sem pagar: quem paga agora é o Bruno, na Caixinha
  if ((await lerDia(agora.data)).turnos[agora.turno].encerrado) return { ok: false, mensagem: ENCERRADO };
  return fecharTurno(nome, agora.data, agora.turno);
}

/**
 * "Não pago no dia": encerra o turno de agora pelo PC sem pagar. As presenças
 * ficam como estão e o turno fica a pagar na Caixinha do Bruno.
 */
export async function acaoPcNaoPago(data: string, turno: string, responsavel: string): Promise<Resultado> {
  if (!(await quemNoPc())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const nome = await responsavelNoPc(responsavel);
  if (!nome) return { ok: false, mensagem: ESCOLHA_O_NOME };
  const agora = turnoAgora();
  if (data !== agora.data || turno !== agora.turno) {
    revalidatePath("/caixinha-turno");
    return { ok: false, mensagem: MUDOU_O_TURNO };
  }
  const t = agora.turno;
  // a taxa que aparecia na tela, guardada só para referência
  const manual = (await lerDia(agora.data)).turnos[t].taxaManual;
  const tk = manual === null ? (await taxasDoPeriodo([agora.data])).get(agora.data) : undefined;
  const taxa = manual ?? (tk?.ok ? tk.taxa[t] : null);
  let vazio = false;
  let jaEstava = false;
  const r = await mexerNoDia(
    agora.data,
    (dia) => {
      if (dia.turnos[t].encerrado) {
        jaEstava = true;
        return dia;
      }
      if (!dia.turnos[t].presencas.length) {
        vazio = true;
        return dia;
      }
      const encerrado = {
        em: new Date().toISOString(),
        por: nome,
        taxa,
      };
      return { ...dia, turnos: { ...dia.turnos, [t]: { ...dia.turnos[t], encerrado } } };
    },
    t,
    quemNoPc,
  );
  if (!r.ok) return r;
  if (jaEstava) return { ok: false, mensagem: ENCERRADO };
  if (vazio) return { ok: false, mensagem: "Marque quem trabalhou antes de encerrar." };
  avisarNaoPagoDepois(agora.data, [t], nome);
  return { ok: true, mensagem: `${ROTULO_TURNO[t]} encerrado sem pagamento. Fica a pagar pelo Bruno.` };
}

/**
 * "Não pago no dia" pela Caixinha: a mesma marca do PC, num turno ou (com
 * turno null) nos turnos abertos do dia que têm alguém marcado. Nada é pago:
 * fica a pagar depois, e o PC não mexe mais nas presenças desses turnos.
 */
export async function acaoNaoPago(data: string, turno: string | null): Promise<Resultado> {
  const nome = await quem();
  if (!nome) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (turno !== null && !turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };
  if (data > hoje()) return { ok: false, mensagem: "Este dia ainda não chegou." };
  // a taxa que aparecia na tela, guardada só para referência (como no PC)
  const antes = await lerDia(data);
  const tk = TURNOS.some((t) => antes.turnos[t].taxaManual === null)
    ? (await taxasDoPeriodo([data])).get(data)
    : undefined;
  let marcados: Turno[] = [];
  let jaEstava = false;
  const r = await mexerNoDia(
    data,
    (dia) => {
      const alvo = turno ? [turno] : turnosAbertos(dia);
      marcados = alvo.filter((t) => !dia.turnos[t].encerrado && dia.turnos[t].presencas.length > 0);
      jaEstava = alvo.length > 0 && alvo.every((t) => dia.turnos[t].encerrado);
      if (!marcados.length) return dia;
      const em = new Date().toISOString();
      const turnos = { ...dia.turnos };
      for (const t of marcados)
        turnos[t] = { ...turnos[t], encerrado: { em, por: nome, taxa: turnos[t].taxaManual ?? (tk?.ok ? tk.taxa[t] : null) } };
      return { ...dia, turnos };
    },
    turno ?? undefined,
  );
  if (!r.ok) return r;
  if (jaEstava) return { ok: false, mensagem: "Já estava marcado como não pago no dia." };
  if (!marcados.length) return { ok: false, mensagem: "Marque quem trabalhou antes." };
  avisarNaoPagoDepois(data, marcados, nome);
  return {
    ok: true,
    mensagem:
      marcados.length === 1
        ? `${ROTULO_TURNO[marcados[0]]} marcado como não pago no dia. Fica a pagar.`
        : "Almoço e jantar marcados como não pagos no dia. Ficam a pagar.",
  };
}

/** Desfaz o "Não pago no dia": o PC volta a marcar presença nesse turno. */
export async function acaoLiberarNoPc(data: string, turno: string): Promise<Resultado> {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  return mexerNoDia(
    data,
    (dia) => {
      const copia = { ...dia.turnos[turno] };
      delete copia.encerrado;
      return { ...dia, turnos: { ...dia.turnos, [turno]: copia } };
    },
    turno,
  );
}
