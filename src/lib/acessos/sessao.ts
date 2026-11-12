// Login por usuário e senha.
//
// Duas áreas separadas — alterar o cardápio e os posts do status — e cada
// funcionário entra só nas que o master liberou. O master entra em tudo,
// inclusive no cadastro (/acessos).
//
// O cookie leva "usuário~versão~assinatura". A assinatura usa a SENHA_PAINEL
// (a senha do master) como chave, então ninguém forja o cookie, e trocar essa
// senha na Vercel derruba todas as sessões. A versão confere com o cadastro a
// cada acesso: trocar a senha de alguém ou desativá-lo tira a pessoa na hora.

import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { registrar } from "@/lib/registro";
import { AREAS, MASTER, lerUsuarios, senhaConfere, type Area } from "./usuarios";

const COOKIE = "sessao";
const DIAS_30 = 60 * 60 * 24 * 30;

export type Sessao = { usuario: string; nome: string; master: boolean; areas: Area[]; pessoa?: string };

function senhaMaster(): string | null {
  const s = process.env.SENHA_PAINEL;
  return s && s.length > 0 ? s : null;
}

/** Falta configurar a senha do master? A tela avisa em vez de travar sem explicação. */
export function faltaConfigurarSenha(): boolean {
  return senhaMaster() === null;
}

function assinar(usuario: string, versao: number): string {
  const chave = `nikolas-sessao:${senhaMaster()}`;
  return createHmac("sha256", chave).update(`${usuario}~${versao}`).digest("base64url");
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const resumo = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Confere usuário e senha para entrar numa área ("master" = só o master,
 * "qualquer" = a porta do painel). Devolve uma mensagem de erro, ou null se entrou.
 */
export async function entrar(
  usuario: string,
  senha: string,
  area: Area | "master" | "qualquer",
): Promise<string | null> {
  const mestre = senhaMaster();
  if (!mestre) return "O painel ainda não foi configurado.";
  const nome = usuario.trim().toLowerCase();
  const falhou = async (motivo: string) => {
    await registrar({ tipo: "falhou", usuario: nome.slice(0, 40) || "(vazio)", onde: motivo });
    return motivo;
  };

  let versao: number;
  let quem = "Bruno";
  if (nome === MASTER) {
    if (!iguais(resumo(senha), resumo(mestre))) return falhou("Usuário ou senha incorretos.");
    versao = 0;
  } else {
    const u = (await lerUsuarios()).find((x) => x.usuario === nome && x.ativo);
    if (!u || !senhaConfere(u, senha)) return falhou("Usuário ou senha incorretos.");
    const liberado = area === "qualquer" ? u.areas.length > 0 : area !== "master" && u.areas.includes(area);
    if (!liberado) return falhou("Este usuário não tem acesso a esta área.");
    versao = u.versao;
    quem = u.nome;
  }
  await registrar({ tipo: "entrou", usuario: nome, nome: quem });

  (await cookies()).set(COOKIE, `${nome}~${versao}~${assinar(nome, versao)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_30,
  });
  return null;
}

export async function sair(): Promise<void> {
  const sessao = await sessaoAtual();
  (await cookies()).delete(COOKIE);
  if (sessao) await registrar({ tipo: "saiu", usuario: sessao.usuario, nome: sessao.nome });
}

// A sessão dura 30 dias, então o login sozinho não diz quem usou o painel.
// A primeira visita de cada funcionário no dia vai para o registro. Esta
// memória é por instância do servidor: pode escapar uma visita repetida, e a
// tela do registro junta as do mesmo dia.
const vistosHoje = new Set<string>();

function anotarVisita(sessao: Sessao) {
  if (sessao.master) return;
  const dia = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const chave = `${sessao.usuario}|${dia}`;
  if (vistosHoje.has(chave)) return;
  vistosHoje.add(chave);
  after(() => registrar({ tipo: "visita", usuario: sessao.usuario, nome: sessao.nome }));
}

/** Quem está nesta máquina, conferido contra o cadastro. Uma leitura por requisição. */
export const sessaoAtual = cache(async (): Promise<Sessao | null> => {
  if (!senhaMaster()) return null;
  const valor = (await cookies()).get(COOKIE)?.value;
  const [usuario, v, sig] = valor?.split("~") ?? [];
  const versao = Number(v);
  if (!usuario || !sig || !Number.isInteger(versao) || !iguais(sig, assinar(usuario, versao))) return null;

  // o master não é da equipe: a "Minha caixinha" não faz sentido para ele
  if (usuario === MASTER)
    return { usuario, nome: "Bruno", master: true, areas: AREAS.filter((a) => a !== "minha-caixinha") };
  const u = (await lerUsuarios()).find((x) => x.usuario === usuario);
  if (!u || !u.ativo || u.versao !== versao) return null;
  const sessao: Sessao = { usuario, nome: u.nome, master: false, areas: u.areas, ...(u.pessoa ? { pessoa: u.pessoa } : {}) };
  anotarVisita(sessao);
  return sessao;
});

/**
 * Guarda das áreas: sem login, volta para a porta do painel. Devolve a sessão
 * e se ela pode entrar na área (quem não pode vê o aviso de sem acesso).
 */
export async function exigir(area: Area | "master"): Promise<{ sessao: Sessao; liberado: boolean }> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  return { sessao, liberado: area === "master" ? sessao.master : sessao.areas.includes(area) };
}

/** A sessão atual pode entrar nesta área? */
export async function pode(area: Area): Promise<boolean> {
  return Boolean((await sessaoAtual())?.areas.includes(area));
}

export async function eMaster(): Promise<boolean> {
  return Boolean((await sessaoAtual())?.master);
}
