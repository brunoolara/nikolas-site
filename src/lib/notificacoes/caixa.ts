// Aviso de fechamento de caixa para os gestores (pedido do Bruno em 26/11/2026):
// só a frase, e o toque abre o fechamento no painel.

import "server-only";
import { lerUsuarios, MASTER } from "@/lib/acessos/usuarios";
import type { Fechamento } from "@/lib/caixa/email";
import { lerInscricoes, lerPreferencias, preferenciasDe } from "./armazem";
import { gestores } from "./caixinha";
import { enviar } from "./enviar";

export async function avisarCaixa(f: Fechamento): Promise<number> {
  const [usuarios, inscricoes, prefs] = await Promise.all([lerUsuarios(), lerInscricoes(), lerPreferencias()]);
  const ativo = (u: string) => u === MASTER || usuarios.some((x) => x.usuario === u && x.ativo);
  const para = gestores(usuarios)
    .filter((u) => ativo(u) && preferenciasDe(prefs, u).caixaFechado)
    .flatMap((u) => inscricoes.filter((i) => i.usuario === u));
  return enviar(
    para,
    {
      title: "Fechamento de caixa",
      body: "O fechamento de caixa foi realizado, clique para consultar os valores.",
      tag: `caixa-${f.id}`,
      url: `/caixa?id=${encodeURIComponent(f.id)}`,
    },
    12 * 3600,
  );
}
