"use server";

import { revalidatePath } from "next/cache";
import { gravarCardapio, lerCardapio } from "@/lib/menu/armazem";
import { pode } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import type { Cardapio, Dia, Especial, MenuExecutivo, MenuSalao, Secao, SecaoSalao } from "@/lib/menu/tipos";
import { DIAS } from "@/lib/menu/tipos";

/** Limpa o que veio do formulário: descarta item sem nome e normaliza o preço. */
function limparSecao(secao: Secao): Secao {
  return {
    ...secao,
    titulo: secao.titulo.trim(),
    nota: secao.nota?.trim() || undefined,
    itens: secao.itens
      .filter((i) => i.nome?.trim())
      .map((i) => ({
        nome: i.nome.trim(),
        desc: i.desc?.trim() || undefined,
        preco: typeof i.preco === "number" && Number.isFinite(i.preco) ? i.preco : null,
      })),
  };
}

function limparEspecial(esp: Especial): Especial {
  return { dia: esp.dia, itens: limparSecao({ id: "", titulo: "", itens: esp.itens }).itens };
}

export async function acaoSalvar(menu: MenuExecutivo, autor: string): Promise<Resultado> {
  if (!(await pode("cardapio"))) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };

  const diasValidos = new Set<Dia>(DIAS);
  const limpo: MenuExecutivo = {
    titulo: menu.titulo.trim() || "Menu executivo",
    horario: menu.horario.trim(),
    frase: menu.frase.trim(),
    secoes: menu.secoes.map(limparSecao),
    especiais: menu.especiais.filter((e) => diasValidos.has(e.dia)).map(limparEspecial),
  };

  try {
    const atual = await lerCardapio();
    const novo: Cardapio = { ...atual, executivo: limpo };
    const salvo = await gravarCardapio(novo, autor.trim() || "painel");
    revalidatePath("/imprimir/executivo");
    revalidatePath("/alterar-cardapio");
    return { ok: true, mensagem: `Salvo (versão ${salvo.versao}).` };
  } catch (erro) {
    console.error("falha ao salvar o cardápio", erro);
    return { ok: false, mensagem: "Não consegui salvar. Tente de novo em instantes." };
  }
}

function limparSecaoSalao(secao: SecaoSalao): SecaoSalao {
  return {
    ...secao,
    titulo: secao.titulo?.trim() || undefined,
    nota: secao.nota?.trim() || undefined,
    itens: secao.itens
      .filter((i) => i.nome?.trim())
      .map((i) => ({
        nome: i.nome.trim(),
        desc: i.desc?.trim() || undefined,
        unidade: i.unidade?.trim() || undefined,
        dia: i.dia?.trim() || undefined,
        // preço vazio na segunda coluna volta a ser item de preço único
        precos: (i.precos ?? []).slice(0, secao.colunas ? 2 : 1),
      })),
  };
}

export async function acaoSalvarSalao(menu: MenuSalao, autor: string): Promise<Resultado> {
  if (!(await pode("cardapio"))) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };

  const limpo: MenuSalao = {
    ...menu,
    frase: menu.frase.trim(),
    historia: menu.historia.map((p) => p.trim()).filter(Boolean),
    folhas: menu.folhas.map((f) => ({
      ...f,
      eyebrow: f.eyebrow?.trim() || undefined,
      frase: f.frase?.trim() || undefined,
    })),
    secoes: menu.secoes.map(limparSecaoSalao),
  };

  try {
    const atual = await lerCardapio();
    const salvo = await gravarCardapio({ ...atual, salao: limpo }, autor.trim() || "painel");
    revalidatePath("/imprimir/salao");
    revalidatePath("/imprimir/domingo");
    revalidatePath("/alterar-cardapio", "layout");
    return { ok: true, mensagem: `Salvo (versão ${salvo.versao}).` };
  } catch (erro) {
    console.error("falha ao salvar o salão", erro);
    return { ok: false, mensagem: "Não consegui salvar. Tente de novo em instantes." };
  }
}
