"use server";

// Tudo que muda a Caixinha. Quem tem a área "caixinha" mexe; dia fechado não
// muda mais até ser reaberto, e os dias se fecham e reabrem em ordem, porque
// o saldo de um dia passa para o seguinte.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import { DATA } from "@/lib/posts/tipos";
import { atualizarDia, atualizarEquipe, gravarEstado, lerDia, lerEquipe, lerEstado } from "@/lib/caixinha/armazem";
import { taxaDoDia } from "@/lib/caixinha/takeat";
import { arredondar, calcularDia, ROTULO_TURNO, TURNOS, type Dia, type Turno } from "@/lib/caixinha/tipos";

const FALHA = "Não consegui gravar. Tente de novo em instantes.";

async function quem(): Promise<string | null> {
  const sessao = await sessaoAtual();
  return sessao?.areas.includes("caixinha") ? sessao.nome : null;
}

const turnoValido = (t: string): t is Turno => (TURNOS as string[]).includes(t);

/** Muda um dia aberto. */
async function mexerNoDia(data: string, mudar: (dia: Dia) => Dia): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };
  try {
    let fechado = false;
    await atualizarDia(data, (dia) => {
      if (dia.fechamento) {
        fechado = true;
        return dia;
      }
      return mudar(dia);
    });
    if (fechado) return { ok: false, mensagem: "Este dia já foi fechado. Reabra para mudar." };
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
  });
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
  });
}

/** Taxa do turno digitada à mão; null volta a usar a da Takeat. */
export async function acaoTaxaManual(data: string, turno: string, valor: number | null) {
  if (!turnoValido(turno)) return { ok: false, mensagem: "Turno inválido." };
  if (valor !== null && !(Number.isFinite(valor) && valor >= 0)) return { ok: false, mensagem: "Valor inválido." };
  return mexerNoDia(data, (dia) => ({
    ...dia,
    turnos: { ...dia.turnos, [turno]: { ...dia.turnos[turno], taxaManual: valor === null ? null : arredondar(valor) } },
  }));
}

export async function acaoAdicionarConsumo(data: string, pessoa: string, valor: number, descricao: string) {
  if (!(Number.isFinite(valor) && valor > 0)) return { ok: false, mensagem: "Coloque o valor do consumo." };
  const equipe = await lerEquipe();
  if (!equipe.some((p) => p.id === pessoa)) return { ok: false, mensagem: "Escolha quem consumiu." };
  return mexerNoDia(data, (dia) => ({
    ...dia,
    consumos: [
      ...dia.consumos,
      { id: randomUUID(), pessoa, valor: arredondar(valor), descricao: descricao.trim(), criadoEm: new Date().toISOString() },
    ],
  }));
}

export async function acaoRemoverConsumo(data: string, id: string) {
  return mexerNoDia(data, (dia) => ({ ...dia, consumos: dia.consumos.filter((c) => c.id !== id) }));
}

/** Fecha o dia: congela a taxa usada, o pagamento de cada um e passa os saldos adiante. */
export async function acaoFecharDia(data: string): Promise<Resultado> {
  const nome = await quem();
  if (!nome) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!DATA.test(data)) return { ok: false, mensagem: "Dia inválido." };

  try {
    const [dia, estado, equipe] = await Promise.all([lerDia(data), lerEstado(), lerEquipe()]);
    if (dia.fechamento) return { ok: false, mensagem: "Este dia já está fechado." };
    if (estado.ultimoFechado && estado.ultimoFechado >= data)
      return { ok: false, mensagem: "Já existe um dia fechado depois deste. Os dias se fecham em ordem." };

    const precisaTakeat = TURNOS.some((t) => dia.turnos[t].taxaManual === null);
    // no fechamento a taxa é buscada de novo, sem a memória de alguns minutos
    const takeat = precisaTakeat ? await taxaDoDia(data, true) : null;
    const taxa = {} as Record<Turno, number>;
    for (const t of TURNOS) {
      const manual = dia.turnos[t].taxaManual;
      const ninguem = !dia.turnos[t].presencas.some((p) => p.pct > 0);
      if (manual !== null) taxa[t] = manual;
      else if (takeat?.ok) taxa[t] = takeat.taxa[t];
      // turno sem ninguém (domingo à noite, por exemplo) não precisa de taxa
      else if (ninguem) taxa[t] = 0;
      else
        return {
          ok: false,
          mensagem: `Sem a taxa da Takeat: ${takeat?.ok === false ? takeat.motivo : ""} Digite a taxa à mão.`,
        };
      if (ninguem && taxa[t] > 0)
        return {
          ok: false,
          mensagem: `O ${ROTULO_TURNO[t].toLowerCase()} teve taxa e ninguém marcado. Marque quem trabalhou antes de fechar.`,
        };
    }

    const linhas = calcularDia(dia, taxa, equipe, estado.saldos);
    const saldos = { ...estado.saldos };
    for (const l of linhas) {
      if (l.novoSaldo < 0) saldos[l.pessoa] = l.novoSaldo;
      else delete saldos[l.pessoa];
    }

    let corrida = false;
    await atualizarDia(data, (atual) => {
      if (atual.fechamento) {
        corrida = true;
        return atual;
      }
      return {
        ...atual,
        fechamento: {
          em: new Date().toISOString(),
          por: nome,
          taxa,
          linhas,
          saldosAntes: estado.saldos,
          fechadoAntes: estado.ultimoFechado,
        },
      };
    });
    if (corrida) return { ok: false, mensagem: "Alguém fechou este dia agora há pouco." };
    await gravarEstado({ saldos, ultimoFechado: data });
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: "Dia fechado." };
  } catch (erro) {
    console.error("caixinha: falha ao fechar o dia", erro);
    return { ok: false, mensagem: FALHA };
  }
}

/** Reabre o último dia fechado e devolve os saldos de antes. */
export async function acaoReabrirDia(data: string): Promise<Resultado> {
  if (!(await quem())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  try {
    const [dia, estado] = await Promise.all([lerDia(data), lerEstado()]);
    if (!dia.fechamento) return { ok: true, mensagem: "" };
    if (estado.ultimoFechado !== data)
      return { ok: false, mensagem: "Só dá para reabrir o último dia fechado. Reabra os dias depois dele antes." };
    const { saldosAntes, fechadoAntes } = dia.fechamento;
    await atualizarDia(data, (atual) => {
      const copia = { ...atual };
      delete copia.fechamento;
      return copia;
    });
    await gravarEstado({ saldos: saldosAntes, ultimoFechado: fechadoAntes });
    revalidatePath("/caixinha", "layout");
    return { ok: true, mensagem: "Dia reaberto." };
  } catch (erro) {
    console.error("caixinha: falha ao reabrir o dia", erro);
    return { ok: false, mensagem: FALHA };
  }
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
