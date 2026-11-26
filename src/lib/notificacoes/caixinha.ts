// Avisos da Caixinha no celular (pedido do Bruno em 25/11/2026).
//
// Quando um turno, um dia ou um período é fechado e pago:
// - cada pessoa que tem login ligado à equipe da Caixinha recebe quanto foi
//   pago a ela (já com o consumo e o saldo negativo descontados);
// - os gestores recebem o total pago, e o do dia inteiro quando o fechamento
//   completou o dia.
// Quando um turno é encerrado sem pagamento ("Não pago no dia", 25/11/2026),
// sai o mesmo par de avisos dizendo o que ficou a receber e o total a pagar.
// Gestores: o master, quem está marcado como gestor em Acessos e a lista fixa
// TOTAL_DA_CAIXINHA_PARA.
//
// Sai depois da resposta (after, em caixinha/acoes.ts): o fechamento não
// espera o push, e uma falha aqui nunca desfaz o fechamento.

import "server-only";
import { lerUsuarios, MASTER, type Usuario } from "@/lib/acessos/usuarios";
import { arredondar, reais, ROTULO_TURNO, type LinhaPagamento, type Turno } from "@/lib/caixinha/tipos";
import {
  lerInscricoes,
  lerPreferencias,
  preferenciasDe,
  TOTAL_DA_CAIXINHA_PARA,
  type Inscricao,
  type Preferencias,
} from "./armazem";
import { enviar, type Mensagem } from "./enviar";
import { guardarNoHistorico } from "./historico";

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
  /** "a-pagar": encerrado sem pagamento; os valores ficam para quando for pago. */
  situacao?: "pago" | "a-pagar";
  /**
   * O turno, quando o aviso é de um turno só fechado na hora. Sem ele, o
   * pagamento juntou o que estava acumulado (turnos não pagos, dias, período).
   */
  turno?: Turno;
};

/** `para`: os aparelhos inscritos (pode ser vazio: o aviso ainda vai para o histórico). */
export type Aviso = { usuario: string; tipo: "caixinhaMinha" | "caixinhaTotal"; para: Inscricao[]; mensagem: Mensagem };

/**
 * O aviso para uma pessoa da equipe: curto, só o primeiro nome e o valor que
 * ela recebe (já com o consumo e o saldo descontados, sem detalhar). Textos do
 * Bruno em 25/11/2026 ("o caixinha", como se fala no Nikola's).
 */
function individual(f: Fechamento, l: LinhaPagamento, url: string): Mensagem {
  const nome = l.nome.trim().split(" ")[0];
  const doTurno = f.turno ? ` do ${ROTULO_TURNO[f.turno].toLowerCase()}` : "";
  const body =
    l.pagar <= 0
      ? `${nome}, desta vez o consumo passou do seu caixinha. Não há valor a receber.`
      : f.situacao === "a-pagar"
        ? `${nome}, o valor do seu caixinha${doTurno} foi de ${reais(l.pagar)}.`
        : f.turno
          ? `${nome}, seu caixinha${doTurno} foi pago: ${reais(l.pagar)}.`
          : `${nome}, o valor dos caixinhas que estavam acumulados foi pago para você: ${reais(l.pagar)}.`;
  return { title: "Caixinha", body, tag: `caixinha-${f.id}`, url };
}

/** O aviso do total, para os gestores. */
function total(f: Fechamento, url: string): Mensagem {
  const partes = arredondar(f.linhas.reduce((s, l) => s + l.almoco + l.jantar, 0));
  const dinheiro = arredondar(f.linhas.reduce((s, l) => s + l.pagar, 0));
  const pessoas = f.linhas.filter((l) => l.almoco + l.jantar > 0).length;
  const quantas = `${pessoas} ${pessoas === 1 ? "pessoa" : "pessoas"}`;
  const descontou = Math.abs(dinheiro - partes) >= 0.01 ? `Taxa repartida: ${reais(partes)} (antes dos descontos de consumo e saldo).` : "";
  const aPagar = f.situacao === "a-pagar";
  const body = [
    aPagar ? `${f.oQue}: ${quantas}, encerrado sem pagamento por ${f.por}.` : `${f.oQue}: ${quantas}, pago por ${f.por}.`,
    descontou,
    !aPagar && f.totalDoDia !== undefined ? `Dia todo: ${reais(f.totalDoDia)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: aPagar ? `Caixinha a pagar: ${reais(dinheiro)}` : `Caixinha paga: ${reais(dinheiro)}`,
    body,
    tag: `caixinha-total-${f.id}`,
    url,
  };
}

/** Quem recebe o total: o master, os marcados como gestor e a lista fixa. */
export function gestores(usuarios: Usuario[]): string[] {
  const marcados = usuarios.filter((u) => u.ativo && u.gestor).map((u) => u.usuario);
  return [...new Set([MASTER, ...TOTAL_DA_CAIXINHA_PARA, ...marcados])];
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
      avisos.push({ usuario: u.usuario, tipo: "caixinhaMinha", para, mensagem: individual(f, l, url) });
    }
  }

  for (const usuario of gestores(usuarios)) {
    const u = usuario === MASTER ? null : ativos.find((x) => x.usuario === usuario);
    if (usuario !== MASTER && !u) continue;
    if (!preferenciasDe(prefs, usuario).caixinhaTotal) continue;
    const para = aparelhos(usuario);
    const url = !u || u.areas.includes("caixinha") ? "/caixinha" : "/";
    if (f.linhas.length) avisos.push({ usuario, tipo: "caixinhaTotal", para, mensagem: total(f, url) });
  }
  return avisos;
}

/** Lê quem está inscrito e manda os avisos de um fechamento. */
export async function avisarFechamento(f: Fechamento): Promise<number> {
  const [usuarios, inscricoes, prefs] = await Promise.all([lerUsuarios(), lerInscricoes(), lerPreferencias()]);
  const avisos = montarAvisos(f, usuarios, inscricoes, prefs);
  // 12 horas: aviso de dinheiro vale mesmo para quem ligou o celular depois
  const enviados = await Promise.all(avisos.map((a) => (a.para.length ? enviar(a.para, a.mensagem, 12 * 3600) : 0)));
  // no histórico (tela Avisos): o total é um aviso só para todos os gestores
  const total = avisos.filter((a) => a.tipo === "caixinhaTotal");
  await Promise.all([
    ...avisos
      .filter((a) => a.tipo === "caixinhaMinha")
      .map((a) => guardarNoHistorico({ tipo: a.tipo, para: [a.usuario], titulo: a.mensagem.title, texto: a.mensagem.body, url: a.mensagem.url })),
    total.length
      ? guardarNoHistorico({
          tipo: "caixinhaTotal",
          para: total.map((a) => a.usuario),
          titulo: total[0].mensagem.title,
          texto: total[0].mensagem.body,
          url: "/caixinha",
        })
      : null,
  ]);
  return enviados.reduce<number>((s, n) => s + n, 0);
}
