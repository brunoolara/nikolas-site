"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { apagarImagens, gravarPosts, lerPosts } from "@/lib/posts/armazem";
import { DATA, NOME_IMAGEM, type Post } from "@/lib/posts/tipos";
import { entrar, entrarEquipe, papel } from "@/lib/menu/sessao";
import type { Resultado } from "../admin/acoes";

/** Aceita as duas senhas: a do dono abre tudo, a da equipe só os posts. */
export async function acaoEntrarPosts(_estado: Resultado, dados: FormData): Promise<Resultado> {
  const senha = String(dados.get("senha") ?? "");
  if ((await entrar(senha)) || (await entrarEquipe(senha))) {
    revalidatePath("/posts");
    return { ok: true, mensagem: "" };
  }
  return { ok: false, mensagem: "Senha incorreta." };
}

export type DadosPost = Pick<Post, "titulo" | "data" | "legenda" | "imagens"> & { id?: string };

export async function acaoSalvarPost(dados: DadosPost): Promise<Resultado & { id?: string }> {
  if ((await papel()) !== "dono") return { ok: false, mensagem: "Só o dono cria e edita posts." };

  const imagens = dados.imagens.filter((n) => NOME_IMAGEM.test(n));
  if (!imagens.length) return { ok: false, mensagem: "Coloque pelo menos uma foto." };
  const data = dados.data && DATA.test(dados.data) ? dados.data : null;

  try {
    const posts = await lerPosts();
    const antigo = dados.id ? posts.find((p) => p.id === dados.id) : undefined;
    const post: Post = {
      id: antigo?.id ?? randomUUID(),
      titulo: dados.titulo.trim() || "Sem título",
      data,
      legenda: dados.legenda?.trim() || undefined,
      imagens,
      criadoEm: antigo?.criadoEm ?? new Date().toISOString(),
      publicacoes: antigo?.publicacoes ?? [],
    };
    await gravarPosts(antigo ? posts.map((p) => (p.id === post.id ? post : p)) : [...posts, post]);
    // fotos tiradas do post nesta edição não servem para mais nada
    if (antigo) await apagarImagens(antigo.imagens.filter((n) => !imagens.includes(n)));
    revalidatePath("/posts", "layout");
    return { ok: true, mensagem: "Salvo.", id: post.id };
  } catch (erro) {
    console.error("falha ao salvar o post", erro);
    return { ok: false, mensagem: "Não consegui salvar. Tente de novo em instantes." };
  }
}

export async function acaoExcluirPost(id: string): Promise<Resultado> {
  if ((await papel()) !== "dono") return { ok: false, mensagem: "Só o dono exclui posts." };
  try {
    const posts = await lerPosts();
    const alvo = posts.find((p) => p.id === id);
    if (!alvo) return { ok: true, mensagem: "" };
    await gravarPosts(posts.filter((p) => p.id !== id));
    await apagarImagens(alvo.imagens);
    revalidatePath("/posts", "layout");
    return { ok: true, mensagem: "Excluído." };
  } catch (erro) {
    console.error("falha ao excluir o post", erro);
    return { ok: false, mensagem: "Não consegui excluir. Tente de novo em instantes." };
  }
}

/** Marca (ou, com desfazer, desmarca a última marcação) que o post foi publicado. */
export async function acaoMarcarPublicado(id: string, por: string, desfazer = false): Promise<Resultado> {
  if (!(await papel())) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  try {
    const posts = await lerPosts();
    const novos = posts.map((p) => {
      if (p.id !== id) return p;
      const publicacoes = desfazer
        ? p.publicacoes.slice(0, -1)
        : [...p.publicacoes, { quando: new Date().toISOString(), por: por.trim() || "equipe" }];
      return { ...p, publicacoes };
    });
    await gravarPosts(novos);
    revalidatePath("/posts");
    return { ok: true, mensagem: "" };
  } catch (erro) {
    console.error("falha ao marcar publicação", erro);
    return { ok: false, mensagem: "Não consegui marcar. Tente de novo." };
  }
}
