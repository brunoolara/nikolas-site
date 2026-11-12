// Cliente único da API pública da Takeat, só no servidor.
//
// A chave do restaurante (TAKEAT_API_KEY) pode fazer 10 consultas por minuto
// e 10.000 por dia (era 500 até 12/11/2026), somando todas as telas. Por isso toda consulta passa por
// aqui: o access token de 15 min é reaproveitado, cada chamada é contada num
// arquivo do dia, e a cota é dividida por prioridade — o "ao vivo" (mesas e
// delivery) para antes, para nunca deixar a Caixinha e o fechamento sem cota.
//
// Não usamos o refresh token: ele é de uso único e duas instâncias da Vercel
// renovando juntas revogariam a chave. Instância nova troca a chave de novo.
//
// Em desenvolvimento, com TAKEAT_FIXTURE_DIR, as respostas vêm de arquivos
// JSON (nome = rota com "/" trocada por "_") e nada vai para a Takeat.

import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { forte } from "@/lib/etag";

const BASE = "https://public-api.takeat.app";

/** Quanto do dia cada prioridade pode usar (de 10.000). */
const TETO: Record<Prioridade, number> = { "ao-vivo": 8500, normal: 9500, essencial: 9900 };

export type Prioridade = "ao-vivo" | "normal" | "essencial";

export class ErroTakeat extends Error {
  constructor(
    public motivo: string,
    public status = 0,
  ) {
    super(motivo);
  }
}

let token: { valor: string; vence: number } | null = null;
let trocando: Promise<string> | null = null;

const hojeBrasil = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const pastaUso = () => (process.env.NODE_ENV === "production" ? "takeat/uso" : "takeat-teste/uso");

/** Consultas feitas hoje (dia de Brasília). */
export async function usoDeHoje(): Promise<number> {
  try {
    const res = await get(`${pastaUso()}/${hojeBrasil()}.json`, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return 0;
    return ((await new Response(res.stream).json()) as { total: number }).total ?? 0;
  } catch {
    return 0;
  }
}

/** Soma uma consulta no contador do dia. Nunca derruba quem chamou. */
async function contar(rota: string): Promise<void> {
  const caminho = `${pastaUso()}/${hojeBrasil()}.json`;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const res = await get(caminho, { access: "private", useCache: false });
      const atual =
        res && res.statusCode === 200 && res.stream
          ? ((await new Response(res.stream).json()) as { total: number; porRota: Record<string, number> })
          : { total: 0, porRota: {} };
      atual.total += 1;
      atual.porRota[rota] = (atual.porRota[rota] ?? 0) + 1;
      await put(caminho, JSON.stringify(atual), {
        access: "private",
        contentType: "application/json",
        ...(res?.blob.etag ? { allowOverwrite: true, ifMatch: forte(res.blob.etag) } : { allowOverwrite: false }),
      });
      return;
    } catch {
      /* outra instância gravou junto: tenta de novo */
    }
  }
}

async function trocarChave(chave: string): Promise<string> {
  const inicio = Date.now();
  await contar("/oauth/token");
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "api_key", api_key: chave }),
    cache: "no-store",
  });
  if (!res.ok) throw new ErroTakeat(`A Takeat recusou a chave (${res.status}).`, res.status);
  const dados = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!dados.access_token) throw new ErroTakeat("A Takeat não devolveu o token.");
  const segundos = typeof dados.expires_in === "number" ? dados.expires_in : 900;
  token = { valor: dados.access_token, vence: inicio + segundos * 1000 - 60_000 };
  return token.valor;
}

async function obterToken(chave: string, renovar = false): Promise<string> {
  if (!renovar && token && Date.now() < token.vence) return token.valor;
  if (!trocando) trocando = trocarChave(chave).finally(() => (trocando = null));
  return trocando;
}

/** Datas relativas nos arquivos de teste: "@-45m" vira agora − 45 min. */
function datasRelativas(texto: string): string {
  return texto.replace(/"@(-?\d+)(m|h)"/g, (_, n: string, u: string) => {
    const ms = Number(n) * (u === "h" ? 3_600_000 : 60_000);
    return JSON.stringify(new Date(Date.now() + ms).toISOString());
  });
}

async function lerFixture(rota: string): Promise<unknown> {
  const nome = rota.replace(/^\//, "").replace(/\//g, "_") + ".json";
  return JSON.parse(datasRelativas(await readFile(path.join(process.env.TAKEAT_FIXTURE_DIR!, nome), "utf-8")));
}

/**
 * GET numa rota de dados (/v1/...). Lança ErroTakeat com uma mensagem pronta
 * para a tela quando falta chave, permissão ou cota.
 */
export async function takeatGet<T>(
  rota: string,
  consulta: Record<string, string | number | undefined> = {},
  prioridade: Prioridade = "normal",
): Promise<T> {
  if (process.env.NODE_ENV === "development" && process.env.TAKEAT_FIXTURE_DIR) return (await lerFixture(rota)) as T;

  const chave = process.env.TAKEAT_API_KEY;
  if (!chave) throw new ErroTakeat("A chave da Takeat ainda não foi configurada na Vercel.");
  if ((await usoDeHoje()) >= TETO[prioridade])
    throw new ErroTakeat(
      prioridade === "ao-vivo"
        ? "A atualização ao vivo pausou: a cota diária da Takeat está quase no fim. Volta amanhã."
        : "A cota diária de consultas à Takeat acabou. Volta amanhã.",
      429,
    );

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(consulta)) if (v !== undefined) params.set(k, String(v));
  const url = `${BASE}${rota}${params.size ? `?${params}` : ""}`;

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    await contar(rota.replace(/\/\d+/g, "/{id}"));
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${await obterToken(chave, tentativa > 0)}` },
      cache: "no-store",
    });
    if (res.status === 401 && tentativa === 0) continue;
    if (res.status === 403)
      throw new ErroTakeat("A chave da Takeat não tem permissão para esta consulta. Confira as permissões no AI Builders.", 403);
    if (res.status === 429) throw new ErroTakeat("A Takeat pediu para esperar (limite por minuto). Tente em um minuto.", 429);
    if (!res.ok) throw new ErroTakeat(`A Takeat respondeu com erro (${res.status}).`, res.status);
    return (await res.json()) as T;
  }
  throw new ErroTakeat("A Takeat recusou o acesso.", 401);
}

export const mensagemDe = (erro: unknown) =>
  erro instanceof ErroTakeat ? erro.motivo : "Não consegui falar com a Takeat agora.";
