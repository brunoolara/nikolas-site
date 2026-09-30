"use server";

import { revalidatePath } from "next/cache";
import { gravarCardapio, lerCardapio } from "@/lib/menu/armazem";
import { autenticado, entrar, sair } from "@/lib/menu/sessao";
import type { Cardapio, Dia, Especial, MenuExecutivo, Secao } from "@/lib/menu/tipos";
import { DIAS } from "@/lib/menu/tipos";

export type Resultado = { ok: boolean; mensagem: string };

export async function acaoEntrar(_estado: Resultado, dados: FormData): Promise<Resultado> {
  const senha = String(dados.get("senha") ?? "");
  if (await entrar(senha)) {
    revalidatePath("/admin");
    return { ok: true, mensagem: "" };
  }
  return { ok: false, mensagem: "Senha incorreta." };
}

export async function acaoSair(): Promise<void> {
  await sair();
  revalidatePath("/admin");
}

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
  if (!(await autenticado())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };

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
    revalidatePath("/admin");
    return { ok: true, mensagem: `Salvo (versão ${salvo.versao}).` };
  } catch (erro) {
    console.error("falha ao salvar o cardápio", erro);
    return { ok: false, mensagem: "Não consegui salvar. Tente de novo em instantes." };
  }
}
