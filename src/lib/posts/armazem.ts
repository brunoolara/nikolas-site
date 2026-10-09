// Onde os posts moram: na mesma loja privada do cardápio. A lista é um JSON
// (posts/lista.json) e cada foto é um arquivo em posts/img/. Privada porque
// post agendado não é público antes da hora — as fotos passam pelo nosso
// servidor, que confere a senha.

import "server-only";
import { del, get, put } from "@vercel/blob";
import type { Post } from "./tipos";

const LISTA = "posts/lista.json";
const PASTA_IMG = "posts/img";

export async function lerPosts(): Promise<Post[]> {
  try {
    const res = await get(LISTA, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return [];
    return (await new Response(res.stream).json()) as Post[];
  } catch {
    return [];
  }
}

export async function gravarPosts(posts: Post[]): Promise<void> {
  await put(LISTA, JSON.stringify(posts, null, 2), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export const tipoImagem = (nome: string) => (nome.endsWith(".png") ? "image/png" : "image/jpeg");

export async function gravarImagem(nome: string, arquivo: Blob): Promise<void> {
  await put(`${PASTA_IMG}/${nome}`, arquivo, { access: "private", contentType: tipoImagem(nome) });
}

export async function lerImagem(nome: string) {
  const res = await get(`${PASTA_IMG}/${nome}`, { access: "private" });
  return res && res.statusCode === 200 && res.stream ? res.stream : null;
}

export async function apagarImagens(nomes: string[]): Promise<void> {
  if (nomes.length) await del(nomes.map((n) => `${PASTA_IMG}/${n}`));
}
