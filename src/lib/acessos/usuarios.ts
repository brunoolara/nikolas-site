// Cadastro dos funcionários: um JSON na loja privada (acessos/usuarios.json).
//
// A senha nunca é guardada legível — só um hash scrypt com sal próprio. O
// master define e troca senhas, mas não consegue ler nenhuma: se alguém
// esquecer, ganha uma nova.
//
// O master (Bruno) não mora aqui: usuário e senha vêm do ambiente da Vercel,
// para que nada que aconteça neste arquivo consiga trancá-lo do lado de fora.

import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";

import { AREAS, type Area } from "./areas";

export { AREAS, type Area };

export type Usuario = {
  usuario: string;
  nome: string;
  areas: Area[];
  ativo: boolean;
  sal: string;
  hash: string;
  /** Sobe a cada troca de senha ou desativação: derruba as sessões abertas. */
  versao: number;
  criadoEm: string;
};

/** Só minúsculas, números, ponto, hífen e sublinhado. */
export const USUARIO_VALIDO = /^[a-z0-9._-]{3,30}$/;
export const SENHA_MINIMA = 6;

export const MASTER = (process.env.MASTER_USUARIO || "bruno").toLowerCase();

const ARQUIVO = "acessos/usuarios.json";

export async function lerUsuarios(): Promise<Usuario[]> {
  try {
    const res = await get(ARQUIVO, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return [];
    return (await new Response(res.stream).json()) as Usuario[];
  } catch {
    return [];
  }
}

export async function gravarUsuarios(usuarios: Usuario[]): Promise<void> {
  await put(ARQUIVO, JSON.stringify(usuarios, null, 2), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export function cifrar(senha: string): { sal: string; hash: string } {
  const sal = randomBytes(16).toString("hex");
  return { sal, hash: scryptSync(senha, sal, 64).toString("hex") };
}

export function senhaConfere(u: Usuario, senha: string): boolean {
  const tentativa = scryptSync(senha, u.sal, 64);
  const guardado = Buffer.from(u.hash, "hex");
  return tentativa.length === guardado.length && timingSafeEqual(tentativa, guardado);
}
