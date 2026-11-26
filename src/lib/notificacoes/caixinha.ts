// Avisos da Caixinha no celular (pedido do Bruno em 25/11/2026).
//
// Quando um turno, um dia ou um período é fechado e pago:
// - cada pessoa paga que tem login ligado à equipe da Caixinha recebe quanto
//   vai receber (já com o consumo e o saldo negativo descontados);
// - o Bruno, a Marta e a Maria Ignez recebem o total, e o do dia inteiro
//   quando o fechamento completou o dia.
//
// Sai depois da resposta (after, em caixinha/acoes.ts): o fechamento não
// espera o push, e uma falha aqui nunca desfaz o fechamento.

import "server-only";
import { lerUsuarios, MASTER, type Usuario } from "@/lib/acessos/usuarios";
import { arredondar, reais, type LinhaPagamento } from "@/lib/caixinha/tipos";
import {
  lerInscricoes,
  lerPreferencias,
  preferenciasDe,
  TOTAL_DA_CAIXINHA_PARA,
  type Inscricao,
  type Preferencias,
} from "./armazem";
import { enviar, type Mensagem } from "./enviar";

export type Fechamento = {
  /** Id do pagamento: se ele for reaberto e fechado de novo, o aviso novo substitui o velho no celular. */
  id: string;
  /** O que foi fechado: "Almoço de qua, 25/11", "De seg, 16/11 a dom, 22/11"... */
  oQue: string;
  linhas: LinhaPagamento[];
  /** Quem fechou. */
  por: string;
  /** Total do dia inteiro, quando este fechamento pagou o último turno do dia. */
  totalDoDia?: number;
};

export type Aviso = { para: Inscricao[]; mensagem: Mensagem };

/** O aviso para uma pessoa da equipe. */
function individual(f: Fechamento, l: LinhaPagamento, url: string): Mensagem {
  const descontos = [
    l.consumo > 0 ? `consumo de ${reais(l.consumo)}` : "",
    l.saldoAnterior < 0 ? `saldo anterior de ${reais(l.saldoAnterior)}` : "",
  ].filter(Boolean);
  const body =
    l.pagar > 0
      ? `${f.oQue}.${descontos.length ? ` Já descontado: ${descontos.join(" e ")}.` : ""}`
      : l.novoSaldo < 0
        ? `${f.oQue}. O desconto passou da sua parte: ${reais(l.novoSaldo)} ficam para o próximo pagamento.`
        : `${f.oQue}.`;
  return {
    title: l.pagar > 0 ? `Sua caixinha: ${reais(l.pagar)}` : "Sua caixinha: nada a receber desta vez",
    body,
    tag: `caixinha-${f.id}`,
    url,
  };
}

/** O aviso do total, para o Bruno, a Marta e a Maria Ignez. */
function total(f: Fechamento, url: string): Mensagem {
  const partes = arredondar(f.linhas.reduce((s, l) => s + l.almoco + l.jantar, 0));
  const pago = arredondar(f.linhas.reduce((s, l) => s + l.pagar, 0));
  const pessoas = f.linhas.filter((l) => l.almoco + l.jantar > 0).length;
  const body = [
    `${f.oQue}: ${pessoas} ${pessoas === 1 ? "pessoa" : "pessoas"}, fechado por ${f.por}.`,
    Math.abs(pago - partes) >= 0.01 ? `Pago em dinheiro: ${reais(pago)} (descontos de consumo e saldo).` : "",
    f.totalDoDia !== undefined ? `Dia todo: ${reais(f.totalDoDia)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { title: `Caixinha: ${reais(partes)}`, body, tag: `caixinha-total-${f.id}`, url };
}

/**
 * Quem recebe o quê. Pura, para dar para testar: só monta, não envia.
 * Login desativado não recebe; preferência desligada no Perfil também não.
 */
export function montarAvisos(
  f: Fechamento,
  usuarios: Usuario[],
  inscricoes: Inscricao[],
  prefs: Record<string, Partial<Preferencias>>,
): Aviso[] {
  const aparelhos = (usuario: string) => inscricoes.filter((i) => i.usuario === usuario);
  const ativos = usuarios.filter((u) => u.ativo);
  const avisos: Aviso[] = [];

  for (const l of f.linhas) {
    for (const u of ativos.filter((x) => x.pessoa === l.pessoa)) {
      if (!preferenciasDe(prefs, u.usuario).caixinhaMinha) continue;
      const para = aparelhos(u.usuario);
      const url = u.areas.includes("minha-caixinha") ? "/minha-caixinha" : "/";
      if (para.length) avisos.push({ para, mensagem: individual(f, l, url) });
    }
  }

  for (const usuario of TOTAL_DA_CAIXINHA_PARA) {
    const u = usuario === MASTER ? null : ativos.find((x) => x.usuario === usuario);
    if (usuario !== MASTER && !u) continue;
    if (!preferenciasDe(prefs, usuario).caixinhaTotal) continue;
    const para = aparelhos(usuario);
    const url = !u || u.areas.includes("caixinha") ? "/caixinha" : "/";
    if (para.length && f.linhas.length) avisos.push({ para, mensagem: total(f, url) });
  }
  return avisos;
}

/** Lê quem está inscrito e manda os avisos de um fechamento. */
export async function avisarFechamento(f: Fechamento): Promise<number> {
  const [usuarios, inscricoes, prefs] = await Promise.all([lerUsuarios(), lerInscricoes(), lerPreferencias()]);
  const avisos = montarAvisos(f, usuarios, inscricoes, prefs);
  // 12 horas: aviso de dinheiro vale mesmo para quem ligou o celular depois
  const enviados = await Promise.all(avisos.map((a) => enviar(a.para, a.mensagem, 12 * 3600)));
  return enviados.reduce((s, n) => s + n, 0);
}
