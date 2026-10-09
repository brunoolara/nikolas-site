// Porta do painel: uma senha só, compartilhada com quem edita o cardápio.
// Uma segunda senha (SENHA_EQUIPE) abre só a área de posts — quem publica o
// status do WhatsApp não precisa poder mexer no cardápio.
//
// Não é sistema de contas de propósito — é um cardápio de restaurante, editado
// por uma ou duas pessoas. A senha fica na variável de ambiente SENHA_PAINEL
// (nunca no código), e o que vai para o navegador é um hash dela, num cookie
// httpOnly. Sem a senha não dá para forjar o cookie.

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "painel";
const COOKIE_EQUIPE = "equipe";
const DIAS_30 = 60 * 60 * 24 * 30;

function senhaConfigurada(): string | null {
  const s = process.env.SENHA_PAINEL;
  return s && s.length > 0 ? s : null;
}

function senhaEquipe(): string | null {
  const s = process.env.SENHA_EQUIPE;
  return s && s.length > 0 ? s : null;
}

function selo(senha: string): string {
  // o nome do projeto entra como sal fixo, para o hash não ser o de "senha pura"
  return createHash("sha256").update(`nikolas:${senha}`).digest("hex");
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A senha confere? Em caso positivo, grava o cookie. */
export async function entrar(tentativa: string): Promise<boolean> {
  return gravarSeConfere(tentativa, senhaConfigurada(), COOKIE);
}

/** Mesma coisa com a senha da equipe, que só abre a área de posts. */
export async function entrarEquipe(tentativa: string): Promise<boolean> {
  return gravarSeConfere(tentativa, senhaEquipe(), COOKIE_EQUIPE);
}

async function gravarSeConfere(tentativa: string, senha: string | null, cookie: string): Promise<boolean> {
  if (!senha || !iguais(selo(tentativa), selo(senha))) return false;
  const jar = await cookies();
  jar.set(cookie, selo(senha), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_30,
  });
  return true;
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(COOKIE_EQUIPE);
}

/** Já está autenticado nesta máquina? */
export async function autenticado(): Promise<boolean> {
  const senha = senhaConfigurada();
  if (!senha) return false;
  const valor = (await cookies()).get(COOKIE)?.value;
  return Boolean(valor && iguais(valor, selo(senha)));
}

/**
 * Quem está nesta máquina: o dono (senha do painel, pode tudo), a equipe
 * (só vê e publica os posts) ou ninguém.
 */
export async function papel(): Promise<"dono" | "equipe" | null> {
  if (await autenticado()) return "dono";
  const senha = senhaEquipe();
  if (!senha) return null;
  const valor = (await cookies()).get(COOKIE_EQUIPE)?.value;
  return valor && iguais(valor, selo(senha)) ? "equipe" : null;
}

/** Falta configurar a senha no ambiente? A tela avisa em vez de travar sem explicação. */
export function faltaConfigurarSenha(): boolean {
  return senhaConfigurada() === null;
}
