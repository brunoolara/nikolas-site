"use server";

// "Paguei" e "Desfazer": a única coisa que o painel grava na Takeat é a baixa
// da conta. Quem marcou fica no registro do painel.

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/acessos/sessao";
import type { Resultado } from "@/lib/acessos/acoes";
import { DATA, hoje, somarDias } from "@/lib/posts/tipos";
import { reais } from "@/lib/caixinha/tipos";
import { darBaixa } from "@/lib/contas/takeat";
import { ErroTakeat, mensagemDe } from "@/lib/takeat/cliente";
import { registrar } from "@/lib/registro";

async function quem() {
  const s = await sessaoAtual();
  return s?.areas.includes("contas") ? s : null;
}

// Em teste local (respostas da Takeat de arquivo), nada vai para o registro de verdade.
const emTeste = () => process.env.NODE_ENV === "development" && Boolean(process.env.TAKEAT_FIXTURE_DIR);

const rotuloDe = (titulo: string, valor: number) =>
  `${titulo.slice(0, 80)}${Number.isFinite(valor) ? ` (${reais(valor)})` : ""}`;

function falha(erro: unknown): Resultado {
  if (erro instanceof ErroTakeat && erro.status === 403)
    return {
      ok: false,
      mensagem:
        "A chave da Takeat do painel não tem permissão para dar baixa. Por enquanto, marque como pago no Gestor da Takeat.",
    };
  console.error("contas: falha na baixa", erro);
  return { ok: false, mensagem: mensagemDe(erro) };
}

export async function acaoPaguei(
  id: number,
  dados: { dia: string; contaId: number; formaId: number | null; titulo: string; valor: number },
): Promise<Resultado> {
  const s = await quem();
  if (!s) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  const dia = hoje();
  if (!Number.isInteger(id) || !Number.isInteger(dados.contaId)) return { ok: false, mensagem: "Conta inválida." };
  if (dados.formaId !== null && !Number.isInteger(dados.formaId)) return { ok: false, mensagem: "Forma inválida." };
  if (!DATA.test(dados.dia) || dados.dia > dia || dados.dia < somarDias(dia, -60))
    return { ok: false, mensagem: "Escolha o dia do pagamento (até hoje)." };
  try {
    await darBaixa(id, { pago: true, dia: dados.dia, contaId: dados.contaId, formaId: dados.formaId });
  } catch (erro) {
    return falha(erro);
  }
  if (!emTeste())
    await registrar({
      tipo: "conta",
      usuario: s.usuario,
      nome: s.nome,
      onde: `marcou como paga: ${rotuloDe(dados.titulo, dados.valor)}`,
    });
  revalidatePath("/contas");
  return { ok: true, mensagem: "" };
}

export async function acaoDesfazer(id: number, titulo: string, valor: number): Promise<Resultado> {
  const s = await quem();
  if (!s) return { ok: false, mensagem: "Sessão expirada. Entre de novo." };
  if (!Number.isInteger(id)) return { ok: false, mensagem: "Conta inválida." };
  try {
    await darBaixa(id, { pago: false });
  } catch (erro) {
    return falha(erro);
  }
  if (!emTeste())
    await registrar({
      tipo: "conta",
      usuario: s.usuario,
      nome: s.nome,
      onde: `desfez o pagamento: ${rotuloDe(titulo, valor)}`,
    });
  revalidatePath("/contas");
  return { ok: true, mensagem: "" };
}
