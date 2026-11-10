// A vigilância do delivery: chamada a cada 2 minutos pelo relógio (pg_cron do
// Supabase do Nikola's), lê os pedidos da Takeat — a mesma leitura do Ao vivo,
// guardada por 2 min, então as duas coisas juntas gastam uma consulta — e
// avisa quem tem o Ao vivo e ligou o aviso:
// - pedido novo: assim que aparece;
// - atrasado: quando passa de 60 min sem sair para entrega.
// Na primeira leitura (sem estado guardado) só anota o que já existe, para
// não disparar uma enxurrada de "pedido novo" de coisas antigas.

import "server-only";
import { comandasAoVivo, casaFuncionando } from "@/lib/takeat/comandas";
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

/** Quem pode receber avisos do delivery: o master e quem tem o Ao vivo. */
async function destinatarios(tipo: TipoAviso): Promise<Inscricao[]> {
  const [inscricoes, prefs, usuarios] = await Promise.all([lerInscricoes(), lerPreferencias(), lerUsuarios()]);
  const comAcesso = new Set([MASTER, ...usuarios.filter((u) => u.ativo && u.areas.includes("operacao")).map((u) => u.usuario)]);
  return inscricoes.filter((i) => comAcesso.has(i.usuario) && (prefs[i.usuario] ?? PREFERENCIAS_PADRAO)[tipo]);
}

const resumoItens = (p: PedidoDelivery) => {
  const n = p.itens.reduce((s, i) => s + i.qtd, 0);
  return n === 1 ? "1 item" : `${n} itens`;
};

const quem = (p: PedidoDelivery) => [p.senha ? `#${p.senha}` : "", p.cliente].filter(Boolean).join(" ");

export type Resultado = { pulou?: string; novos: number; atrasados: number; enviados: number };

export async function vigiarDelivery(): Promise<Resultado> {
  if (!casaFuncionando()) return { pulou: "fora do horário da casa", novos: 0, atrasados: 0, enviados: 0 };
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
    (p) => p.alerta === "atrasado" && (p.etapa === "preparo" || p.etapa === "pronto") && !jaAtrasados.has(p.id),
  );

  let enviados = 0;
  if (novos.length) {
    const para = await destinatarios("deliveryNovo");
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
    const para = await destinatarios("deliveryAtrasado");
    for (const p of atrasados) {
      enviados += await enviar(para, {
        title: "Delivery atrasado",
        body: `${quem(p)}: ${p.minutos} min e ainda não saiu.`,
        tag: `atraso-${p.id}`,
        url: "/operacao?ver=delivery",
      });
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
