// Aviso de fechamento de caixa para os gestores (pedido do Bruno em 26/11/2026):
// só a frase, e o toque abre o fechamento no painel.

import "server-only";
import { lerUsuarios, MASTER } from "@/lib/acessos/usuarios";
import { lerInscricoes, lerPreferencias, preferenciasDe } from "./armazem";
import { gestores } from "./caixinha";
import { enviar } from "./enviar";
import { guardarNoHistorico } from "./historico";
import { turnoDe, type Fechamento } from "@/lib/caixa/email";
import { reais } from "@/lib/caixinha/tipos";

export async function avisarCaixa(f: Fechamento): Promise<number> {
  const [usuarios, inscricoes, prefs] = await Promise.all([lerUsuarios(), lerInscricoes(), lerPreferencias()]);
  const ativo = (u: string) => u === MASTER || usuarios.some((x) => x.usuario === u && x.ativo);
  const quem = gestores(usuarios).filter((u) => ativo(u) && preferenciasDe(prefs, u).caixaFechado);
  const para = quem.flatMap((u) => inscricoes.filter((i) => i.usuario === u));
  const url = `/caixa?id=${encodeURIComponent(f.id)}`;
  const [enviados] = await Promise.all([
    enviar(
      para,
      {
        title: "Fechamento de caixa",
        body: "O fechamento de caixa foi realizado, clique para consultar os valores.",
        tag: `caixa-${f.id}`,
        url,
      },
      12 * 3600,
    ),
    guardarNoHistorico({
      tipo: "caixaFechado",
      para: quem,
      titulo: `Caixa fechado · ${turnoDe(f).toLowerCase()}`,
      texto: `Total de ${reais(f.total)}.`,
      url,
    }),
  ]);
  return enviados;
}
