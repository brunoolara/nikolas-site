// A loja privada do painel, no Supabase do Nikola's (desde 12/11/2026).
//
// Antes era o Vercel Blob, que no plano grátis só aceita 2.000 gravações por
// mês: o painel passou disso e a Vercel pausou a loja por 30 dias. O Supabase
// grátis não conta gravações. Para mexer o mínimo no resto do site, este
// arquivo imita a parte do @vercel/blob que usamos (get, put, del, list):
//
// - Arquivos JSON ficam na tabela `loja` (caminho → conteúdo em texto), com
//   uma `versao` que faz o papel do etag: put com ifMatch só grava se a versão
//   for a mesma que foi lida, e falha se alguém gravou no meio.
// - Imagens (.jpg, .png) ficam no bucket privado `loja` do Storage.
//
// A chave service_role fica só na Vercel (SUPABASE_SERVICE_ROLE_KEY); a
// tabela e o bucket não têm política nenhuma, então só o servidor acessa.

import "server-only";

type Get = { statusCode: 200; stream: ReadableStream<Uint8Array>; blob: { etag: string } };
type OpcoesPut = { access?: "private"; contentType?: string; allowOverwrite?: boolean; ifMatch?: string };

const BUCKET = "loja";
const ehImagem = (caminho: string) => /\.(jpe?g|png)$/i.test(caminho);

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Falta configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  // a chave nova do Supabase (sb_secret_...) vai só no apikey; a antiga
  // (service_role, um JWT) também no Authorization
  const cabecalhos: Record<string, string> = chave.startsWith("sb_secret_")
    ? { apikey: chave }
    : { apikey: chave, authorization: `Bearer ${chave}` };
  return { url, cabecalhos };
}

async function pedir(caminho: string, init: RequestInit = {}) {
  const { url, cabecalhos } = config();
  return fetch(`${url}${caminho}`, { ...init, cache: "no-store", headers: { ...cabecalhos, ...init.headers } });
}

const tabela = (filtro: string) => `/rest/v1/loja?${filtro}`;
const eq = (caminho: string) => `caminho=eq.${encodeURIComponent(caminho)}`;
const objeto = (caminho: string) => `/storage/v1/object/${BUCKET}/${caminho.split("/").map(encodeURIComponent).join("/")}`;

function stream(texto: string): ReadableStream<Uint8Array> {
  return new Response(texto).body!;
}

async function falha(res: Response, o: string): Promise<never> {
  throw new Error(`loja: ${o} falhou (${res.status}) ${(await res.text()).slice(0, 200)}`);
}

/** Lê um arquivo. null se não existe. */
export async function get(caminho: string, _opcoes?: { access?: "private"; useCache?: boolean }): Promise<Get | null> {
  if (ehImagem(caminho)) {
    const res = await pedir(objeto(caminho));
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok || !res.body) return falha(res, `ler ${caminho}`);
    return { statusCode: 200, stream: res.body, blob: { etag: res.headers.get("etag") ?? "" } };
  }
  const res = await pedir(tabela(`${eq(caminho)}&select=conteudo,versao`));
  if (!res.ok) return falha(res, `ler ${caminho}`);
  const [linha] = (await res.json()) as { conteudo: string; versao: number }[];
  if (!linha) return null;
  return { statusCode: 200, stream: stream(linha.conteudo), blob: { etag: `"${linha.versao}"` } };
}

/** Uma versão nova, sempre diferente da anterior. */
const novaVersao = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

/**
 * Grava um arquivo. Como no Blob: com `ifMatch`, só se ninguém gravou depois
 * da leitura; com `allowOverwrite: false`, só se ainda não existe. Nos dois
 * casos, se não der, lança erro (quem chama relê e tenta de novo).
 */
export async function put(caminho: string, corpo: string | Blob, opcoes: OpcoesPut = {}): Promise<{ pathname: string }> {
  if (ehImagem(caminho)) {
    const res = await pedir(objeto(caminho), {
      method: "POST",
      body: corpo,
      headers: { "content-type": opcoes.contentType ?? "application/octet-stream", "x-upsert": "true" },
    });
    if (!res.ok) return falha(res, `gravar ${caminho}`);
    return { pathname: caminho };
  }

  const conteudo = typeof corpo === "string" ? corpo : await corpo.text();
  const linha = { caminho, conteudo, versao: novaVersao(), atualizado_em: new Date().toISOString() };
  const json = { "content-type": "application/json" };

  if (opcoes.ifMatch) {
    const versao = opcoes.ifMatch.replace(/^W\//, "").replace(/"/g, "");
    const res = await pedir(tabela(`${eq(caminho)}&versao=eq.${encodeURIComponent(versao)}`), {
      method: "PATCH",
      body: JSON.stringify({ conteudo, versao: linha.versao, atualizado_em: linha.atualizado_em }),
      headers: { ...json, prefer: "return=representation" },
    });
    if (!res.ok) return falha(res, `gravar ${caminho}`);
    if (!((await res.json()) as unknown[]).length) throw new Error(`loja: ${caminho} mudou desde a leitura`);
    return { pathname: caminho };
  }

  const res = await pedir(tabela(""), {
    method: "POST",
    body: JSON.stringify(linha),
    headers: {
      ...json,
      prefer: opcoes.allowOverwrite === false ? "return=minimal" : "resolution=merge-duplicates,return=minimal",
    },
  });
  if (res.status === 409) throw new Error(`loja: ${caminho} já existe`);
  if (!res.ok) return falha(res, `gravar ${caminho}`);
  return { pathname: caminho };
}

/** Apaga um ou vários arquivos. */
export async function del(caminhos: string | string[]): Promise<void> {
  const lista = Array.isArray(caminhos) ? caminhos : [caminhos];
  const imagens = lista.filter(ehImagem);
  const dados = lista.filter((c) => !ehImagem(c));
  if (imagens.length) {
    const res = await pedir(`/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes: imagens }),
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) await falha(res, "apagar imagens");
  }
  if (dados.length) {
    const lista = dados.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(",");
    const res = await pedir(tabela(`caminho=in.(${encodeURIComponent(lista)})`), { method: "DELETE" });
    if (!res.ok) await falha(res, "apagar");
  }
}

/** Os arquivos JSON que começam com `prefix`, do mais novo ao mais antigo. */
export async function list(opcoes: { prefix: string; limit?: number }): Promise<{
  blobs: { pathname: string; uploadedAt: Date }[];
}> {
  const como = encodeURIComponent(`${opcoes.prefix.replace(/[%_]/g, (c) => `\\${c}`)}%`);
  const res = await pedir(
    tabela(`caminho=like.${como}&select=caminho,atualizado_em&order=caminho.desc&limit=${opcoes.limit ?? 1000}`),
  );
  if (!res.ok) return falha(res, "listar");
  const linhas = (await res.json()) as { caminho: string; atualizado_em: string }[];
  return { blobs: linhas.map((l) => ({ pathname: l.caminho, uploadedAt: new Date(l.atualizado_em) })) };
}
