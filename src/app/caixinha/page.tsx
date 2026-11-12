// Um dia da Caixinha: quem trabalhou em cada turno e com quanto, a taxa de
// cada turno (da Takeat ou digitada), o consumo de cada um e o que cada
// pessoa recebe. O dia fica no endereço (?dia=AAAA-MM-DD); sem ele, hoje.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { DATA, hoje, rotuloData, somarDias } from "@/lib/posts/tipos";
import { lerDia, lerEquipe, lerEstado, lerPagamento } from "@/lib/caixinha/armazem";
import { taxaDoDia } from "@/lib/caixinha/takeat";
import { calcularDia, TURNOS, type Turno } from "@/lib/caixinha/tipos";
import EditorTurno from "./EditorTurno";
import Consumos from "./Consumos";
import BotaoFechar from "./BotaoFechar";
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
  const link = (d: string) => (d === dia ? "/caixinha" : `/caixinha?dia=${d}`);

  const [registro, equipe, estado] = await Promise.all([lerDia(data), lerEquipe(), lerEstado()]);
  const fechado = registro.fechamento;
  const pagamento = fechado ? await lerPagamento(fechado.pagamento) : null;
  // dia pago junto com outros: aqui aparece só a parte do dia, sem saldo
  const variosDias = Boolean(pagamento && pagamento.dias.length > 1);
  const precisaTakeat = !fechado && TURNOS.some((t) => registro.turnos[t].taxaManual === null);
  const takeat = precisaTakeat ? await taxaDoDia(data) : null;

  const taxa = {} as Record<Turno, number>;
  for (const t of TURNOS) {
    taxa[t] = fechado
      ? fechado.taxa[t]
      : (registro.turnos[t].taxaManual ?? (takeat?.ok ? takeat.taxa[t] : 0));
  }
  const linhas = fechado ? (pagamento?.linhas ?? []) : calcularDia(registro, taxa, equipe, estado.saldos);
  const porTurno = fechado ? fechado.partes : linhas;
  const ativos = equipe.filter((p) => p.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const podeReabrir = Boolean(fechado) && estado.ultimoFechado === (pagamento?.fim ?? data);
  const fechadoDepois = !fechado && Boolean(estado.ultimoFechado && estado.ultimoFechado > data);

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
            <Link href="/caixinha" className="text-sm font-semibold text-verde hover:underline">
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {TURNOS.map((t) => (
          <EditorTurno
            key={t}
            data={data}
            turno={t}
            fechado={Boolean(fechado)}
            pessoas={equipe
              .filter((p) => p.ativo || registro.turnos[t].presencas.some((x) => x.id === p.id))
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((p) => ({ id: p.id, nome: p.nome }))}
            presencas={registro.turnos[t].presencas}
            taxa={taxa[t]}
            taxaManual={fechado ? null : registro.turnos[t].taxaManual}
            takeat={takeat?.ok ? { taxa: takeat.taxa[t], comandas: takeat.comandas[t] } : null}
            partes={Object.fromEntries(porTurno.map((l) => [l.pessoa, l[t]]))}
          />
        ))}
      </div>

      <Consumos
        data={data}
        fechado={Boolean(fechado)}
        equipe={ativos.map((p) => ({ id: p.id, nome: p.nome }))}
        consumos={registro.consumos.map((c) => ({
          ...c,
          nome: equipe.find((p) => p.id === c.pessoa)?.nome ?? "(removido)",
        }))}
      />

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">{variosDias ? "O que cada um ganhou no dia" : "Pagamento do dia"}</h3>
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
        />
      </section>

      {pagamento && !variosDias ? <Comprovantes id={pagamento.id} linhas={pagamento.linhas} /> : null}
    </div>
  );
}
