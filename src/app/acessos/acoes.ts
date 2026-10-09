"use server";

// Cadastro dos funcionários. Tudo aqui é só do master.

import { revalidatePath } from "next/cache";
import { eMaster } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import {
  AREAS,
  MASTER,
  SENHA_MINIMA,
  USUARIO_VALIDO,
  cifrar,
  gravarUsuarios,
  lerUsuarios,
  type Area,
} from "@/lib/acessos/usuarios";

const soAreas = (areas: string[]) => AREAS.filter((a) => areas.includes(a));

export async function acaoCriarUsuario(_estado: Resultado, dados: FormData): Promise<Resultado> {
  if (!(await eMaster())) return { ok: false, mensagem: "Só o master cadastra funcionários." };

  const usuario = String(dados.get("usuario") ?? "").trim().toLowerCase();
  const nome = String(dados.get("nome") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  const areas = soAreas(dados.getAll("areas").map(String));

  if (!USUARIO_VALIDO.test(usuario))
    return { ok: false, mensagem: "Usuário: de 3 a 30 letras minúsculas, números, ponto ou hífen, sem espaço." };
  if (usuario === MASTER) return { ok: false, mensagem: "Esse usuário é o do master." };
  if (!nome) return { ok: false, mensagem: "Coloque o nome da pessoa." };
  if (senha.length < SENHA_MINIMA) return { ok: false, mensagem: `A senha precisa de ${SENHA_MINIMA} caracteres ou mais.` };
  if (!areas.length) return { ok: false, mensagem: "Marque pelo menos uma área." };

  const usuarios = await lerUsuarios();
  if (usuarios.some((u) => u.usuario === usuario)) return { ok: false, mensagem: "Já existe alguém com esse usuário." };

  await gravarUsuarios([
    ...usuarios,
    { usuario, nome, areas, ativo: true, ...cifrar(senha), versao: 1, criadoEm: new Date().toISOString() },
  ]);
  revalidatePath("/acessos");
  return { ok: true, mensagem: `${nome} cadastrado.` };
}

export type Mudanca = { areas?: Area[]; ativo?: boolean; senha?: string; nome?: string };

export async function acaoAlterarUsuario(usuario: string, mudanca: Mudanca): Promise<Resultado> {
  if (!(await eMaster())) return { ok: false, mensagem: "Só o master altera funcionários." };

  const usuarios = await lerUsuarios();
  const u = usuarios.find((x) => x.usuario === usuario);
  if (!u) return { ok: false, mensagem: "Funcionário não encontrado." };

  if (mudanca.senha !== undefined && mudanca.senha.length < SENHA_MINIMA)
    return { ok: false, mensagem: `A senha precisa de ${SENHA_MINIMA} caracteres ou mais.` };
  if (mudanca.areas && !soAreas(mudanca.areas).length) return { ok: false, mensagem: "Deixe pelo menos uma área." };

  const novo = { ...u };
  if (mudanca.nome?.trim()) novo.nome = mudanca.nome.trim();
  if (mudanca.areas) novo.areas = soAreas(mudanca.areas);
  if (mudanca.ativo !== undefined) novo.ativo = mudanca.ativo;
  if (mudanca.senha !== undefined) Object.assign(novo, cifrar(mudanca.senha));
  // senha nova ou desativação tiram a pessoa de onde ela estiver logada
  if (mudanca.senha !== undefined || mudanca.ativo === false) novo.versao = u.versao + 1;

  await gravarUsuarios(usuarios.map((x) => (x.usuario === usuario ? novo : x)));
  revalidatePath("/acessos");
  return { ok: true, mensagem: mudanca.senha !== undefined ? "Senha trocada." : "Salvo." };
}

export async function acaoExcluirUsuario(usuario: string): Promise<Resultado> {
  if (!(await eMaster())) return { ok: false, mensagem: "Só o master exclui funcionários." };
  const usuarios = await lerUsuarios();
  await gravarUsuarios(usuarios.filter((x) => x.usuario !== usuario));
  revalidatePath("/acessos");
  return { ok: true, mensagem: "Excluído." };
}
