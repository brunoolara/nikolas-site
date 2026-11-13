// Um dia da Caixinha: quem trabalhou em cada turno e com quanto, a taxa de
// cada turno (da Takeat ou digitada), o consumo de cada um e o que cada
// pessoa recebe. O dia fica no endereço (?dia=AAAA-MM-DD); sem ele, hoje.
// Com ?ver=almoco ou ?ver=jantar a tela mostra só aquele turno, para mostrar
// à equipe a divisão do turno sem o resto do dia.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { DATA, hoje, rotuloData, somarDias } from "@/lib/posts/tipos";
import { lerDia, lerEquipe, lerEstado, lerPagamento } from "@/lib/caixinha/armazem";
import { taxaDoDia } from "@/lib/caixinha/takeat";
import {
  calcularDia,
  partesDoDia,
  pctPadrao,
  reais,
  ROTULO_TURNO,
  TURNOS,
  turnoDoConsumo,
  turnosAbertos,
  type Turno,
} from "@/lib/caixinha/tipos";
import EditorTurno from "./EditorTurno";
import Consumos from "./Consumos";
import BotaoFechar, { BotaoTurno } from "./BotaoFechar";
import Abas from "./Abas";
import TabelaPagamento from "./TabelaPagamento";
import Comprovantes from "./Comprovantes";

export default async function Caixinha({ searchParams }: PageProps<"/caixinha">) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const { sessao, liberado } = await exigir("caixinha");
  if (!liberado) return null;
  const busca = await searchParams;
  const dia = hoje();
  const data = typeof busca.dia === "string" && DATA.test(busca.dia) ? busca.dia : dia;
  const ver: Turno | null = busca.ver === "almoco" || busca.ver === "jantar" ? busca.ver : null;
  const link = (d: string, v: Turno | null = ver) => {
    const q = new URLSearchParams();
    if (d !== dia) q.set("dia", d);
    if (v) q.set("ver", v);
    return q.size ? `/caixinha?${q}` : "/caixinha";
  };

  const [registro, equipe, estado] = await Promise.all([lerDia(data), lerEquipe(), lerEstado()]);
  const fechado = registro.fechamento;
  // turno pago sozinho antes (fica registrado mesmo depois de o dia fechar)
  const tp = registro.turnoPago;
  const abertos = turnosAbertos(registro);
  const [pagamento, pagTurno] = await Promise.all([
    fechado ? lerPagamento(fechado.pagamento) : null,
    tp ? lerPagamento(tp.pagamento) : null,
  ]);
  // dia pago junto com outros: aqui aparece só a parte do dia, sem saldo
  const variosDias = Boolean(pagamento && pagamento.dias.length > 1);
  const precisaTakeat = abertos.some((t) => registro.turnos[t].taxaManual === null);
  const takeat = precisaTakeat ? await taxaDoDia(data) : null;

  const taxa = {} as Record<Turno, number>;
  for (const t of TURNOS) {
    taxa[t] = fechado
      ? fechado.taxa[t]
      : tp?.turno === t
        ? tp.taxa
        : (registro.turnos[t].taxaManual ?? (takeat?.ok ? takeat.taxa[t] : 0));
  }
  // dia aberto: o pagamento que falta (sem o turno já pago)
  const linhas = fechado ? (pagamento?.linhas ?? []) : calcularDia(registro, taxa, equipe, estado.saldos, abertos);
  // o turno pago tem as presenças travadas, então a conta dá o que foi pago
  const porTurno = fechado ? fechado.partes : partesDoDia(registro, taxa, equipe);
  const ativos = equipe.filter((p) => p.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const ultimoPag = estado.pagamentos?.at(-1);
  const eUltimo = (id: string | undefined, fim: string) => (ultimoPag ? ultimoPag === id : estado.ultimoFechado === fim);
  const podeReabrir = Boolean(fechado) && eUltimo(fechado?.pagamento, pagamento?.fim ?? data);
  const fechadoDepois = !fechado && Boolean(estado.ultimoFechado && estado.ultimoFechado > data);
  const restante = tp && !fechado ? abertos[0] : null;
  const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Caixinha"
        descricao="A taxa de serviço de cada turno, dividida entre quem trabalhou, com o consumo descontado."
      />
      <Abas atual="dia" master={sessao.master} />

      <nav className="p-cartao mt-4 flex items-center justify-between gap-2 p-3" aria-label="Escolher o dia">
        <Link
          href={link(somarDias(data, -1))}
          className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg"
          aria-label="Dia anterior"
        >
          ‹
        </Link>
        <div className="text-center">
          <h2 className="font-display text-2xl first-letter:uppercase">{rotuloData(data)}</h2>
          {data === dia ? (
            <p className="text-sm text-cafe">Hoje</p>
          ) : (
            <Link href={link(dia)} className="text-sm font-semibold text-verde hover:underline">
              Voltar para hoje
            </Link>
          )}
        </div>
        <Link
          href={link(somarDias(data, 1))}
          className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg"
          aria-label="Próximo dia"
        >
          ›
        </Link>
      </nav>

      <nav className="mt-3 flex gap-2" aria-label="O que mostrar">
        {([null, ...TURNOS] as (Turno | null)[]).map((v) => (
          <Link
            key={v ?? "dia"}
            href={link(data, v)}
            aria-current={v === ver ? "page" : undefined}
            className={`p-btn p-btn-sm flex-1 sm:flex-none ${v === ver ? "p-btn-primario" : "p-btn-secundario"}`}
          >
            {v ? ROTULO_TURNO[v] : "Dia todo"}
          </Link>
        ))}
      </nav>

      {fechado ? (
        <p className="p-aviso p-aviso-ok mt-4">
          Dia fechado por {fechado.por} em{" "}
          {new Date(fechado.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          {variosDias && pagamento ? (
            <>
              , no pagamento de {rotuloData(pagamento.ini)} a {rotuloData(pagamento.fim)}.{" "}
              <Link href={`/caixinha/pagamento?id=${pagamento.id}`} className="font-semibold underline">
                Ver o pagamento
              </Link>
            </>
          ) : (
            ". Para mudar, reabra."
          )}
        </p>
      ) : null}
      {tp ? (
        <p className="p-aviso p-aviso-ok mt-4">
          {ROTULO_TURNO[tp.turno]} pago à parte por {tp.por} em {hora(tp.em)}.{" "}
          <Link href={`/caixinha/pagamento?id=${tp.pagamento}`} className="font-semibold underline">
            Ver o pagamento do {ROTULO_TURNO[tp.turno].toLowerCase()}
          </Link>
          {restante ? ` O ${ROTULO_TURNO[restante].toLowerCase()} continua aberto.` : null}
        </p>
      ) : null}
      {takeat && !takeat.ok ? (
        <p className="p-aviso p-aviso-alerta mt-4">
          {takeat.motivo} Enquanto isso, digite a taxa de cada turno à mão.
        </p>
      ) : null}
      {!ativos.length ? (
        <p className="p-aviso p-aviso-info mt-4">
          Ninguém na equipe ainda.{" "}
          <Link href="/caixinha/equipe" className="font-semibold text-verde underline">
            Cadastre quem entra no rateio
          </Link>
          .
        </p>
      ) : null}

      <div className={`mt-6 grid gap-4 ${ver ? "" : "md:grid-cols-2"}`}>
        {(ver ? [ver] : TURNOS).map((t) => (
          <EditorTurno
            key={t}
            data={data}
            turno={t}
            fechado={Boolean(fechado) || tp?.turno === t}
            pessoas={equipe
              .filter((p) => p.ativo || registro.turnos[t].presencas.some((x) => x.id === p.id))
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((p) => ({ id: p.id, nome: p.nome, padrao: pctPadrao(p, data) }))}
            presencas={registro.turnos[t].presencas}
            taxa={taxa[t]}
            taxaManual={fechado || tp?.turno === t ? null : registro.turnos[t].taxaManual}
            takeat={takeat?.ok && tp?.turno !== t ? { taxa: takeat.taxa[t], comandas: takeat.comandas[t] } : null}
            partes={Object.fromEntries(porTurno.map((l) => [l.pessoa, l[t]]))}
            encerrado={
              fechado || tp?.turno === t || !registro.turnos[t].encerrado
                ? null
                : {
                    em: new Date(registro.turnos[t].encerrado!.em).toLocaleTimeString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    por: registro.turnos[t].encerrado!.por,
                  }
            }
          />
        ))}
      </div>

      {ver ? (
        <>
          <DivisaoTurno turno={ver} taxa={taxa[ver]} partes={porTurno.map((l) => ({ nome: l.nome, valor: l[ver] }))}>
            <BotaoTurno
              data={data}
              turno={ver}
              pago={Boolean(fechado) || tp?.turno === ver}
              fechaODia={Boolean(tp) && tp?.turno !== ver}
              podeReabrir={!fechado && tp?.turno === ver && eUltimo(tp.pagamento, data)}
              bloqueado={fechadoDepois}
            />
          </DivisaoTurno>
          {tp?.turno === ver && pagTurno ? (
            <Comprovantes fonte={{ id: pagTurno.id }} linhas={pagTurno.linhas} titulo={`do ${ROTULO_TURNO[ver].toLowerCase()}`} />
          ) : !fechado && !fechadoDepois ? (
            <Comprovantes
              fonte={{ ini: data, fim: data, turno: ver }}
              linhas={calcularDia(registro, taxa, equipe, estado.saldos, [ver])}
              titulo={`do ${ROTULO_TURNO[ver].toLowerCase()}`}
            />
          ) : null}
        </>
      ) : (
        <>
        <Consumos
          data={data}
          fechado={Boolean(fechado)}
          equipe={ativos.map((p) => ({ id: p.id, nome: p.nome }))}
          consumos={registro.consumos.map((c) => ({
            ...c,
            turno: turnoDoConsumo(c),
            nome: equipe.find((p) => p.id === c.pessoa)?.nome ?? "(removido)",
          }))}
          turnoPago={tp?.turno ?? null}
        />

        <section className="p-cartao mt-6 p-5">
          <h3 className="p-cartao-titulo">
            {variosDias
              ? "O que cada um ganhou no dia"
              : tp
                ? `Pagamento do ${ROTULO_TURNO[TURNOS.find((t) => t !== tp.turno)!].toLowerCase()}`
                : "Pagamento do dia"}
          </h3>
          {variosDias && fechado ? (
            <TabelaPagamento modo="dia" partes={fechado.partes} />
          ) : linhas.length ? (
            <TabelaPagamento modo="pagamento" linhas={linhas} pago={Boolean(fechado)} />
          ) : (
            <p className="mt-2 text-sm text-cafe">Marque quem trabalhou para ver o pagamento.</p>
          )}

          <BotaoFechar
            data={data}
            fechado={Boolean(fechado)}
            podeReabrir={podeReabrir}
            bloqueado={fechadoDepois}
            diasNoPagamento={pagamento?.dias.length ?? 1}
            restante={restante}
            linksTurno={{ almoco: link(data, "almoco"), jantar: link(data, "jantar") }}
          />
        </section>

        {tp && pagTurno ? (
          <Comprovantes fonte={{ id: pagTurno.id }} linhas={pagTurno.linhas} titulo={`do ${ROTULO_TURNO[tp.turno].toLowerCase()}`} />
        ) : null}
        {pagamento && !variosDias ? (
          <Comprovantes
            fonte={{ id: pagamento.id }}
            linhas={pagamento.linhas}
            titulo={tp ? `do ${ROTULO_TURNO[TURNOS.find((t) => t !== tp.turno)!].toLowerCase()}` : undefined}
          />
        ) : !fechado && linhas.length ? (
          <Comprovantes
            fonte={{ ini: data, fim: data }}
            linhas={linhas}
            titulo={restante ? `do ${ROTULO_TURNO[restante].toLowerCase()}` : undefined}
          />
        ) : null}
        </>
      )}
    </div>
  );
}

/** A divisão de um turno em letra grande, para mostrar à equipe. */
function DivisaoTurno({
  turno,
  taxa,
  partes,
  children,
}: {
  turno: Turno;
  taxa: number;
  partes: { nome: string; valor: number }[];
  children?: React.ReactNode;
}) {
  const lista = partes.filter((p) => p.valor > 0);
  const total = lista.reduce((s, p) => s + p.valor, 0);
  return (
    <section className="p-cartao mt-6 p-5">
      <h3 className="p-cartao-titulo">Divisão do {ROTULO_TURNO[turno].toLowerCase()}</h3>
      <p className="mt-1 text-sm text-cafe">Taxa do turno {reais(taxa)}</p>
      {lista.length ? (
        <ul className="mt-3 divide-y divide-linha/70">
          {lista.map((p) => (
            <li key={p.nome} className="flex items-baseline justify-between gap-3 py-3">
              <span className="text-lg font-semibold">{p.nome}</span>
              <span className="text-xl font-semibold tabular-nums">{reais(p.valor)}</span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 py-3 text-cafe">
            <span>Total da equipe no turno</span>
            <span className="font-semibold tabular-nums">{reais(total)}</span>
          </li>
        </ul>
      ) : (
        <p className="mt-3 text-sm text-cafe">Marque quem trabalhou no turno para ver a divisão.</p>
      )}
      <p className="mt-3 text-xs text-cafe">O consumo lançado no turno e o saldo entram no pagamento.</p>
      {children}
    </section>
  );
}
