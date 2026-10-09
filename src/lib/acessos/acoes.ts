"use server";

import { revalidatePath } from "next/cache";
import { entrar, sair } from "./sessao";
import type { Area } from "./usuarios";

export type Resultado = { ok: boolean; mensagem: string };

export async function acaoEntrar(area: Area | "master", _estado: Resultado, dados: FormData): Promise<Resultado> {
  const erro = await entrar(String(dados.get("usuario") ?? ""), String(dados.get("senha") ?? ""), area);
  if (erro) return { ok: false, mensagem: erro };
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "" };
}

export async function acaoSair(): Promise<void> {
  await sair();
  revalidatePath("/", "layout");
}
