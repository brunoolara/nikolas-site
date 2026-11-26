// A vigilância do delivery: chamada a cada 2 minutos pelo relógio (pg_cron do
// Supabase do Nikola's), lê os pedidos da Takeat — a mesma leitura do Ao vivo,
// guardada por 2 min, então as duas coisas juntas gastam uma consulta — e
// avisa quem tem o Ao vivo e ligou o aviso:
// - pedido novo: assim que aparece;
// - atrasado: só quando o pedido está há 1h30 ou mais "em preparação" (Bruno,
//   12/11/2026). Pronto, saiu ou entregue não avisa mais: avisava pedido que já
//   tinha saído e só não tinha sido marcado como saiu na Takeat. O tempo conta
//   de quando o pedido foi aceito (ou da abertura, se não tiver o aceite).
// Na primeira leitura (sem estado guardado) só anota o que já existe, para
// não disparar uma enxurrada de "pedido novo" de coisas antigas.

import "server-only";
import { atualizaAgora, comandasAoVivo } from "@/lib/takeat/comandas";
import { ehDelivery, instanteAtual, pedidoDelivery, inicioDoServico, type PedidoDelivery } from "@/lib/operacao/regras";
import { MASTER, lerUsuarios } from "@/lib/acessos/usuarios";
import {
  PREFERENCIAS_PADRAO,
  gravarEstadoDelivery,
  lerEstadoDelivery,
  lerInscricoes,
  lerPreferencias,
  type Inscricao,
  type TipoAviso,
} from "./armazem";
import { enviar } from "./enviar";
import { guardarNoHistorico } from "./historico";

/** Quem pode receber avisos do delivery: o master e quem tem o Ao vivo. */
/** Quem tem o Ao vivo e quer esse aviso, e os aparelhos inscritos dessas pessoas. */
async function quemRecebe(tipo: TipoAviso): Promise<{ usuarios: string[]; aparelhos: Inscricao[] }> {
  const [inscricoes, prefs, cadastro] = await Promise.all([lerInscricoes(), lerPreferencias(), lerUsuarios()]);
  const usuarios = [MASTER, ...cadastro.filter((u) => u.ativo && u.areas.includes("operacao")).map((u) => u.usuario)].filter(
    (u) => ({ ...PREFERENCIAS_PADRAO, ...prefs[u] })[tipo],
  );
  return { usuarios, aparelhos: inscricoes.filter((i) => usuarios.includes(i.usuario)) };
}

const resumoItens = (p: PedidoDelivery) => {
  const n = p.itens.reduce((s, i) => s + i.qtd, 0);
  return n === 1 ? "1 item" : `${n} itens`;
};

const quem = (p: PedidoDelivery) => [p.senha ? `#${p.senha}` : "", p.cliente].filter(Boolean).join(" ");

const AVISO_PREPARO_MIN = 90;

/** Minutos desde que o pedido entrou em preparação. */
function minutosEmPreparo(p: PedidoDelivery, agora: number): number {
  const desde = new Date(p.marcos.find((m) => m.rotulo === "Aceito")?.em || p.inicio).getTime();
  return Math.max(0, Math.round((agora - desde) / 60_000));
}

export type Resultado = { pulou?: string; novos: number; atrasados: number; enviados: number };

export async function vigiarDelivery(): Promise<Resultado> {
  if (!atualizaAgora()) return { pulou: "pausa da madrugada", novos: 0, atrasados: 0, enviados: 0 };
  const leitura = await comandasAoVivo();
  if (leitura.erro) return { pulou: leitura.erro, novos: 0, atrasados: 0, enviados: 0 };

  const agora = instanteAtual();
  const desde = inicioDoServico(agora);
  const pedidos = leitura.comandas
    .filter(ehDelivery)
    .map((c) => pedidoDelivery(c, agora))
    .filter((p) => p.etapa !== "cancelado" && new Date(p.inicio).getTime() >= desde - 6 * 3_600_000);

  const estado = await lerEstadoDelivery();
  const ids = pedidos.map((p) => p.id);
  if (!estado) {
    await gravarEstadoDelivery({ vistos: ids, atrasados: [], em: new Date().toISOString() });
    return { pulou: "primeira leitura: só anotei os pedidos que já existiam", novos: 0, atrasados: 0, enviados: 0 };
  }

  const vistos = new Set(estado.vistos);
  const jaAtrasados = new Set(estado.atrasados);
  const novos = pedidos.filter((p) => !vistos.has(p.id) && p.etapa !== "finalizado" && p.etapa !== "saiu");
  const atrasados = pedidos.filter(
    (p) => p.etapa === "preparo" && minutosEmPreparo(p, agora) >= AVISO_PREPARO_MIN && !jaAtrasados.has(p.id),
  );

  let enviados = 0;
  if (novos.length) {
    const para = (await quemRecebe("deliveryNovo")).aparelhos;
    for (const p of novos) {
      enviados += await enviar(para, {
        title: p.ifood ? "Novo pedido do iFood" : p.retirada ? "Novo pedido para retirar" : "Novo pedido de delivery",
        body: [quem(p), p.bairro, resumoItens(p)].filter(Boolean).join(" · "),
        tag: `delivery-${p.id}`,
        url: "/operacao?ver=delivery",
      });
    }
  }
  if (atrasados.length) {
    const { usuarios, aparelhos } = await quemRecebe("deliveryAtrasado");
    for (const p of atrasados) {
      const mensagem = {
        title: "Delivery atrasado",
        body: `${quem(p)}: ${minutosEmPreparo(p, agora)} min em preparação.`,
        tag: `atraso-${p.id}`,
        url: "/operacao?ver=delivery",
      };
      enviados += await enviar(aparelhos, mensagem);
      // o novo pedido não vai para a tela Avisos (são muitos por dia); o atrasado vai
      await guardarNoHistorico({ tipo: "deliveryAtrasado", para: usuarios, titulo: mensagem.title, texto: mensagem.body, url: mensagem.url });
    }
  }

  // guarda só o que ainda aparece na leitura, para o arquivo não crescer para sempre
  const presentes = new Set(ids);
  await gravarEstadoDelivery({
    vistos: [...new Set([...estado.vistos.filter((id) => presentes.has(id)), ...ids])],
    atrasados: [...new Set([...estado.atrasados, ...atrasados.map((p) => p.id)])].filter((id) => presentes.has(id)),
    em: new Date().toISOString(),
  });
  return { novos: novos.length, atrasados: atrasados.length, enviados };
}
