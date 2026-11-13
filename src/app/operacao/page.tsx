// Ao vivo: mesas abertas e pedidos de delivery, numa tela só, com abas.
// A aba fica no endereço (?ver=delivery). Os dados vêm de uma leitura da
// Takeat compartilhada por todo mundo e renovada a cada 2 min no servidor.

import Link from "next/link";
import { exigir } from "@/lib/acessos/sessao";
import { comandasAoVivo } from "@/lib/takeat/comandas";
import {
  LIMITE_MESA_MIN,
  duracao,
  horaDe,
  painelDelivery,
  instanteAtual,
  painelMesas,
  type Mesa,
  type PedidoDelivery,
} from "@/lib/operacao/regras";
import { reais } from "@/lib/caixinha/tipos";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import AutoAtualizar from "./AutoAtualizar";

export default async function AoVivo({ searchParams }: PageProps<"/operacao">) {
  if (!(await exigir("operacao")).liberado) return null;
  const [busca, leitura] = await Promise.all([searchParams, comandasAoVivo()]);
  const aba = busca.ver === "delivery" ? "delivery" : "mesas";
  // o instante da leitura de cada pedido muda a cada minuto: por isso é lido aqui, e não no componente
  const agora = instanteAtual();
  const mesas = painelMesas(leitura.comandas, agora);
  const delivery = painelDelivery(leitura.comandas, agora);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Ao vivo"
        descricao="Mesas abertas e pedidos de delivery da Takeat, com o que está passando do tempo em destaque."
        acoes={<AutoAtualizar lidoEm={leitura.em} />}
      />

      {leitura.erro ? <p className="p-aviso p-aviso-alerta mt-4">{leitura.erro} Mostrando a última leitura.</p> : null}
      {leitura.foraDoHorario ? (
        <p className="p-aviso p-aviso-info mt-4">
          De madrugada (2h às 6h) a atualização pausa: mostrando a última leitura, das {horaDe(leitura.em)}.
        </p>
      ) : null}

      <div className="p-abas mt-6" role="tablist">
        {(
          [
            ["mesas", "Mesas", "/operacao", mesas.abertas.length, mesas.paradas],
            ["delivery", "Delivery", "/operacao?ver=delivery", delivery.emPreparo.length, delivery.atrasados],
          ] as const
        ).map(([chave, nome, href, qtd, alertas]) => (
          <Link
            key={chave}
            href={href}
            role="tab"
            aria-selected={aba === chave}
            className="p-aba"
          >
            <Icone nome={chave === "mesas" ? "mesa" : "moto"} className="h-4 w-4" />
            {nome}
            <span className={`rounded-full px-1.5 text-xs ${aba === chave ? "bg-papel/20" : "bg-creme"}`}>{qtd}</span>
            {alertas ? (
              <span className="rounded-full bg-[var(--p-vermelho)] px-1.5 text-xs text-white">{alertas}</span>
            ) : null}
          </Link>
        ))}
      </div>

      {aba === "mesas" ? <TelaMesas p={mesas} /> : <TelaDelivery p={delivery} />}
    </div>
  );
}

function Numero({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: string; detalhe?: string; alerta?: boolean }) {
  return (
    <div className={`p-cartao p-4 ${alerta ? "border-[var(--p-vermelho)]/50 bg-[var(--p-vermelho-fundo)]" : ""}`}>
      <p className="p-kpi-rotulo">{rotulo}</p>
      <p className={`p-kpi-valor ${alerta ? "text-[var(--p-vermelho)]" : ""}`}>{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-cafe">{detalhe}</p> : null}
    </div>
  );
}

// ----------------------------------------------------------------- mesas

function TelaMesas({ p }: { p: ReturnType<typeof painelMesas> }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Mesas abertas" valor={String(p.abertas.length)} detalhe={`${p.abertas.filter((m) => m.balcao).length} no balcão`} />
        <Numero
          rotulo={`Sem pedir há ${LIMITE_MESA_MIN}+ min`}
          valor={String(p.paradas)}
          detalhe={p.paradas ? "Passe nessas mesas" : "Nenhuma parada"}
          alerta={p.paradas > 0}
        />
        <Numero rotulo="Consumo em aberto" valor={reais(p.consumoAberto)} detalhe="Sem os 10%" />
        <Numero
          rotulo="Fechadas hoje"
          valor={String(p.fechadasHoje)}
          detalhe={
            p.ticketMedio !== null
              ? `Ticket ${reais(p.ticketMedio)}${p.permanenciaMedia ? ` · ${duracao(p.permanenciaMedia)} em média` : ""}`
              : "—"
          }
        />
      </div>

      {p.abertas.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {p.abertas.map((m) => (
            <CartaoMesa key={m.id} m={m} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-8 text-center text-sm text-cafe">
          Nenhuma mesa aberta agora.
        </p>
      )}
    </>
  );
}

function CartaoMesa({ m }: { m: Mesa }) {
  return (
    <details
      className={`p-cartao group overflow-hidden ${m.parada ? "border-chope bg-[var(--p-ambar-fundo)]" : ""}`}
    >
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-2xl">{m.rotulo}</h3>
          {m.parada ? (
            <span className="p-selo bg-chope text-tinta">
              <Icone nome="alerta" className="h-3.5 w-3.5" />
              sem pedir há {duracao(m.semPedirHa)}
            </span>
          ) : (
            <span className="p-selo">último pedido há {duracao(m.semPedirHa)}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-cafe">
          Aberta há {duracao(m.abertaHa)} · desde {horaDe(m.inicio)}
        </p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-sm text-cafe">
            {m.qtdItens} {m.qtdItens === 1 ? "item" : "itens"} · {m.rodadas.length}{" "}
            {m.rodadas.length === 1 ? "rodada" : "rodadas"}
            {m.garcons.length ? <span className="block">{m.garcons.join(", ")}</span> : null}
          </p>
          <p className="font-semibold tabular-nums">{reais(m.consumo)}</p>
        </div>
      </summary>
      <div className="border-t border-linha/70 bg-white/70 px-4 py-3 text-sm">
        {m.clientes.length ? <p className="mb-2 text-cafe">Cliente: {m.clientes.join(", ")}</p> : null}
        {m.rodadas.length ? (
          <ol className="space-y-2">
            {m.rodadas.map((r, i) => (
              <li key={i}>
                <p className="text-xs font-semibold text-cafe">
                  {horaDe(r.em)}
                  {r.garcom ? ` · ${r.garcom}` : ""}
                </p>
                <ul>
                  {r.itens.map((it, k) => (
                    <li key={k}>
                      {it.qtd}× {it.nome}
                      {it.obs ? <span className="text-cafe"> ({it.obs})</span> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-cafe">Nenhum pedido lançado ainda.</p>
        )}
      </div>
    </details>
  );
}

// -------------------------------------------------------------- delivery

function TelaDelivery({ p }: { p: ReturnType<typeof painelDelivery> }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          rotulo="Em preparo"
          valor={String(p.emPreparo.length)}
          detalhe={`${p.saiu.length} ${p.saiu.length === 1 ? "saiu" : "saíram"}, falta finalizar`}
        />
        <Numero
          rotulo="Passaram de 1h"
          valor={String(p.atrasados)}
          detalhe={p.atrasados ? "Ainda não saíram" : "Nenhum atrasado"}
          alerta={p.atrasados > 0}
        />
        <Numero
          rotulo="Tempo até sair"
          valor={p.mediaAteSair !== null ? duracao(p.mediaAteSair) : "—"}
          detalhe={`${p.saiuNoPrazo} no prazo · ${p.saiuAtrasado} acima de 1h`}
        />
        <Numero rotulo="Delivery hoje" valor={reais(p.totalHoje)} detalhe={`${p.pedidosHoje} pedidos`} />
      </div>

      <SecaoPedidos titulo="Em preparo" pedidos={p.emPreparo} vazio="Nenhum pedido em preparo." />
      <SecaoPedidos
        titulo="Saíram para entrega"
        pedidos={p.saiu}
        vazio="Nenhum pedido na rua. Os que saem aparecem aqui até serem finalizados."
      />
      {p.aguardando.length ? (
        <SecaoPedidos titulo="Aguardando pagamento online" pedidos={p.aguardando} vazio="" />
      ) : null}

      <details className="mt-8">
        <summary className="cursor-pointer font-display text-xl">Finalizados hoje ({p.finalizados.length})</summary>
        <div className="mt-3 grid gap-3">
          {p.finalizados.map((x) => (
            <CartaoPedido key={x.id} x={x} />
          ))}
        </div>
      </details>
    </>
  );
}

function SecaoPedidos({ titulo, pedidos, vazio }: { titulo: string; pedidos: PedidoDelivery[]; vazio: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl">
        {titulo} <span className="text-base text-cafe">({pedidos.length})</span>
      </h2>
      {pedidos.length ? (
        <div className="mt-3 grid gap-3">
          {pedidos.map((x) => (
            <CartaoPedido key={x.id} x={x} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-5 text-center text-sm text-cafe">
          {vazio}
        </p>
      )}
    </section>
  );
}

const ROTULO_ETAPA: Record<PedidoDelivery["etapa"], string> = {
  aguardando: "Aguardando pagamento",
  preparo: "Em preparo",
  saiu: "Saiu",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function CartaoPedido({ x }: { x: PedidoDelivery }) {
  const cor =
    x.alerta === "atrasado"
      ? "border-[var(--p-vermelho)]/60 bg-[var(--p-vermelho-fundo)]"
      : x.alerta === "atencao"
        ? "border-chope bg-[var(--p-ambar-fundo)]"
        : "";
  return (
    <details className={`p-cartao overflow-hidden ${cor} ${x.etapa === "cancelado" ? "opacity-60" : ""}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {x.senha ? <span className="text-cafe">#{x.senha} </span> : null}
            {x.cliente}
          </p>
          <p className="text-sm text-cafe">
            {x.retirada ? "Retirada no balcão" : x.bairro || x.endereco || "Endereço não informado"} · pedido às{" "}
            {horaDe(x.inicio)}
            {x.agendadoPara ? ` · agendado para ${horaDe(x.agendadoPara)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {x.ifood ? <span className="p-selo">iFood</span> : null}
          <span className={`p-selo ${x.etapa === "saiu" || x.etapa === "finalizado" ? "p-selo-verde" : ""}`}>
            {x.retirada && x.etapa === "saiu" ? "Pronto" : ROTULO_ETAPA[x.etapa]}
          </span>
          <span
            className={`min-w-16 text-right font-display text-xl tabular-nums ${
              x.alerta === "atrasado" ? "text-[var(--p-vermelho)]" : x.alerta === "atencao" ? "text-[var(--p-ambar-texto)]" : ""
            }`}
            title={x.parado ? "Tempo da abertura até sair" : "Tempo desde a abertura"}
          >
            {duracao(x.minutos)}
          </span>
          <span className="w-24 text-right font-semibold tabular-nums">{reais(x.valor)}</span>
        </div>
      </summary>
      <div className="grid gap-4 border-t border-linha/70 bg-white/70 px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <p className="p-kpi-rotulo">Itens</p>
          <ul className="mt-1 space-y-0.5">
            {x.itens.map((it, k) => (
              <li key={k}>
                {it.qtd}× {it.nome}
                {it.complementos.length ? <span className="text-cafe"> — {it.complementos.join(", ")}</span> : null}
                {it.obs ? <span className="block text-xs text-cafe">Obs.: {it.obs}</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="p-kpi-rotulo">Andamento</p>
          <ul className="mt-1 space-y-0.5">
            {x.marcos.map((m) => (
              <li key={m.rotulo} className="flex justify-between gap-3">
                <span>{m.rotulo}</span>
                <span className="tabular-nums text-cafe">{horaDe(m.em)}</span>
              </li>
            ))}
          </ul>
          {!x.retirada && x.endereco ? <p className="mt-2 text-cafe">{x.endereco}{x.bairro ? ` — ${x.bairro}` : ""}</p> : null}
          {x.telefone ? (
            <a href={`tel:${x.telefone}`} className="mt-1 inline-block font-semibold text-verde hover:underline">
              {x.telefone}
            </a>
          ) : null}
        </div>
      </div>
    </details>
  );
}

