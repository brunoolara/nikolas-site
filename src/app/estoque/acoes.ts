"use server";

// Lançamentos da contagem. Quem tem a área "estoque" conta e fecha; só o
// master reabre e organiza os itens.

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import { DATA } from "@/lib/posts/tipos";
import { atualizarAjustes, atualizarContagem } from "@/lib/estoque/armazem";
import { ehCategoria, semanaDe } from "@/lib/estoque/categorias";
import { lerInsumos } from "@/lib/estoque/insumos";
import { mensagemDe } from "@/lib/takeat/cliente";

const FALHA = "Não consegui gravar. Tente de novo em instantes.";

async function quem() {
  const s = await sessaoAtual();
  return s?.areas.includes("estoque") ? s : null;
}

const semanaValida = (s: string) => DATA.test(s) && semanaDe(s) === s;

/** Grava (ou, com null, apaga) a quantidade contada de um item. */
export async function acaoLancar(semana: string, id: number, qtd: number | null): Promise<Resultado> {
  const s = await quem();
  if (!s) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!semanaValida(semana) || !Number.isInteger(id)) return { ok: false, mensagem: "Item inválido." };
  if (qtd !== null && !(Number.isFinite(qtd) && qtd >= 0 && qtd < 1_000_000))
    return { ok: false, mensagem: "Quantidade inválida." };
  try {
    let fechada = false;
    await atualizarContagem(semana, (c) => {
      if (c.fechada) {
        fechada = true;
        return c;
      }
      const itens = { ...c.itens };
      if (qtd === null) delete itens[id];
      else itens[id] = { qtd, por: s.nome, em: new Date().toISOString() };
      return { ...c, itens };
    });
    if (fechada) return { ok: false, mensagem: "Esta contagem já foi fechada." };
    return { ok: true, mensagem: "" };
  } catch (erro) {
    console.error("estoque: falha ao lançar", erro);
    return { ok: false, mensagem: FALHA };
  }
}

/** Fecha a contagem e guarda o saldo e o custo que a Takeat mostra agora. */
export async function acaoFechar(semana: string): Promise<Resultado> {
  const s = await quem();
  if (!s) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!semanaValida(semana)) return { ok: false, mensagem: "Semana inválida." };

  let takeat: Record<string, { saldo: number; custo: number }> | null = null;
  let semTakeat: string | undefined;
  try {
    const { insumos } = await lerInsumos(true);
    takeat = Object.fromEntries(insumos.map((i) => [String(i.id), { saldo: i.saldo, custo: i.custo }]));
  } catch (erro) {
    semTakeat = mensagemDe(erro);
  }

  try {
    await atualizarContagem(semana, (c) =>
      c.fechada ? c : { ...c, fechada: { em: new Date().toISOString(), por: s.nome, takeat, semTakeat } },
    );
    revalidatePath("/estoque", "layout");
    return {
      ok: true,
      mensagem: semTakeat
        ? `Contagem fechada, mas sem o saldo da Takeat (${semTakeat})`
        : "Contagem fechada. O saldo da Takeat foi guardado junto para o comparativo.",
    };
  } catch (erro) {
    console.error("estoque: falha ao fechar", erro);
    return { ok: false, mensagem: FALHA };
  }
}

export async function acaoReabrir(semana: string): Promise<Resultado> {
  const s = await sessaoAtual();
  if (!s?.master) return { ok: false, mensagem: "Só o master reabre uma contagem." };
  try {
    await atualizarContagem(semana, (c) => {
      const copia = { ...c };
      delete copia.fechada;
      return copia;
    });
    revalidatePath("/estoque", "layout");
    return { ok: true, mensagem: "Contagem reaberta." };
  } catch (erro) {
    console.error("estoque: falha ao reabrir", erro);
    return { ok: false, mensagem: FALHA };
  }
}

/** Troca a categoria de um item ou o tira da contagem (só o master). */
export async function acaoAjustarItem(
  id: number,
  mudanca: { categoria?: string | null; naoContar?: boolean },
): Promise<Resultado> {
  const s = await sessaoAtual();
  if (!s?.master) return { ok: false, mensagem: "Só o master organiza os itens." };
  if (mudanca.categoria && !ehCategoria(mudanca.categoria)) return { ok: false, mensagem: "Categoria inválida." };
  try {
    await atualizarAjustes((a) => {
      const atual = { ...(a[id] ?? {}) };
      if (mudanca.categoria === null) delete atual.categoria;
      else if (mudanca.categoria && ehCategoria(mudanca.categoria)) atual.categoria = mudanca.categoria;
      if (mudanca.naoContar !== undefined) atual.naoContar = mudanca.naoContar || undefined;
      const novo = { ...a };
      if (Object.values(atual).some((v) => v !== undefined)) novo[id] = atual;
      else delete novo[id];
      return novo;
    });
    revalidatePath("/estoque", "layout");
    return { ok: true, mensagem: "" };
  } catch (erro) {
    console.error("estoque: falha ao ajustar item", erro);
    return { ok: false, mensagem: FALHA };
  }
}
