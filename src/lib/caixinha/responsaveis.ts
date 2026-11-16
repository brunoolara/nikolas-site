// Quem pode aparecer como responsável por fechar o turno no PC do
// restaurante (pedido de 15/11/2026): o PC fica logado com um usuário só, e o
// gerente do dia escolhe o próprio nome antes de pagar, para o pagamento não
// ficar no nome do login do PC. Vale a equipe da Caixinha e os logins do
// painel (o gerente pode ser sócio, fora do rateio), menos o próprio PC.

import "server-only";
import { lerUsuarios } from "@/lib/acessos/usuarios";
import { lerEquipe } from "./armazem";

export async function responsaveis(usuarioDoPc: string): Promise<string[]> {
  const [equipe, usuarios] = await Promise.all([lerEquipe(), lerUsuarios()]);
  const nomes = [
    ...equipe.filter((p) => p.ativo).map((p) => p.nome),
    ...usuarios.filter((u) => u.ativo && u.usuario !== usuarioDoPc).map((u) => u.nome),
  ];
  const vistos = new Set<string>();
  return nomes
    .map((n) => n.trim())
    .filter((n) => n && !vistos.has(n.toLowerCase()) && vistos.add(n.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Como fica no pagamento: o nome escolhido, marcando que foi pelo PC. */
export const porNoPc = (nome: string) => `${nome} (pelo PC)`;
