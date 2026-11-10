// Um dia da Caixinha: quem trabalhou em cada turno e com quanto, a taxa de
// cada turno (da Takeat ou digitada), o consumo de cada um e o que cada
// pessoa recebe. O dia fica no endereço (?dia=AAAA-MM-DD); sem ele, hoje.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import { exigir } from "@/lib/acessos/sessao";
import { DATA, hoje, rotuloData, somarDias } from "@/lib/posts/tipos";
import { lerDia, lerEquipe, lerEstado } from "@/lib/caixinha/armazem";
import { taxaDoDia } from "@/lib/caixinha/takeat";
import { calcularDia, reais, TURNOS, type Turno } from "@/lib/caixinha/tipos";
import EditorTurno from "./EditorTurno";
import Consumos from "./Consumos";
import BotaoFechar from "./BotaoFechar";

export default async function Caixinha({ searchParams }: PageProps<"/caixinha">) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("caixinha")).liberado) return null;
  const busca = await searchParams;
  const dia = hoje();
  const data = typeof busca.dia === "string" && DATA.test(busca.dia) ? busca.dia : dia;
  const link = (d: string) => (d === dia ? "/caixinha" : `/caixinha?dia=${d}`);

  const [registro, equipe, estado] = await Promise.all([lerDia(data), lerEquipe(), lerEstado()]);
  const fechado = registro.fechamento;
  const precisaTakeat = !fechado && TURNOS.some((t) => registro.turnos[t].taxaManual === null);
  const takeat = precisaTakeat ? await taxaDoDia(data) : null;

  const taxa = {} as Record<Turno, number>;
  for (const t of TURNOS) {
    taxa[t] = fechado
      ? fechado.taxa[t]
      : (registro.turnos[t].taxaManual ?? (takeat?.ok ? takeat.taxa[t] : 0));
  }
  const linhas = fechado ? fechado.linhas : calcularDia(registro, taxa, equipe, estado.saldos);
  const total = linhas.reduce((s, l) => s + l.pagar, 0);
  const ativos = equipe.filter((p) => p.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const podeReabrir = Boolean(fechado) && estado.ultimoFechado === data;
  const fechadoDepois = !fechado && Boolean(estado.ultimoFechado && estado.ultimoFechado > data);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Caixinha"
        descricao="90% da taxa de serviço de cada turno, dividida entre quem trabalhou, com o consumo descontado."
        acoes={
          <>
            <Link href="/caixinha/equipe" className="p-btn p-btn-secundario">
              <Icone nome="equipe" className="h-4 w-4" />
              Equipe
            </Link>
            <Link href="/caixinha/mes" className="p-btn p-btn-secundario">
              <Icone nome="calendario" className="h-4 w-4" />
              Mês
            </Link>
          </>
        }
      />

      <nav className="p-cartao mt-6 flex items-center justify-between gap-2 p-3" aria-label="Escolher o dia">
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
          {new Date(fechado.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Para mudar, reabra.
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
            partes={Object.fromEntries(linhas.map((l) => [l.pessoa, l[t]]))}
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
        <h3 className="p-cartao-titulo">Pagamento do dia</h3>
        {linhas.length ? (
          <>
          {/* no celular: uma linha por pessoa, com o que recebe em destaque */}
          <ul className="mt-3 divide-y divide-linha/70 sm:hidden">
            {linhas.map((l) => (
              <li key={l.pessoa} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{l.nome}</p>
                  <p className="mt-0.5 text-xs text-cafe">
                    {[
                      l.almoco ? `Almoço ${reais(l.almoco)}` : "",
                      l.jantar ? `Jantar ${reais(l.jantar)}` : "",
                      l.consumo ? `Consumo − ${reais(l.consumo)}` : "",
                      l.saldoAnterior ? `Saldo ${reais(l.saldoAnterior)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sem valores ainda"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold tabular-nums">{reais(l.pagar)}</p>
                  {l.novoSaldo < 0 ? (
                    <p className="text-xs text-red-700">fica devendo {reais(-l.novoSaldo)}</p>
                  ) : null}
                </div>
              </li>
            ))}
            <li className="flex justify-between py-3 font-semibold">
              <span>Total a pagar</span>
              <span className="tabular-nums">{reais(total)}</span>
            </li>
          </ul>
          <div className="mt-3 hidden overflow-x-auto sm:block">
            <table className="p-tabela">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th className="num">Almoço</th>
                  <th className="num">Jantar</th>
                  <th className="num">Consumo</th>
                  <th className="num">Saldo anterior</th>
                  <th className="num">Recebe</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.pessoa}>
                    <td className="font-medium">{l.nome}</td>
                    <td className="num">{l.almoco ? reais(l.almoco) : "—"}</td>
                    <td className="num">{l.jantar ? reais(l.jantar) : "—"}</td>
                    <td className="num">{l.consumo ? `− ${reais(l.consumo)}` : "—"}</td>
                    <td className="num">{l.saldoAnterior ? reais(l.saldoAnterior) : "—"}</td>
                    <td className="num font-semibold">
                      {reais(l.pagar)}
                      {l.novoSaldo < 0 ? (
                        <span className="block text-xs font-normal text-red-700">fica devendo {reais(-l.novoSaldo)}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Total a pagar</td>
                  <td className="num text-base">{reais(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-cafe">Marque quem trabalhou para ver o pagamento.</p>
        )}

        <BotaoFechar data={data} fechado={Boolean(fechado)} podeReabrir={podeReabrir} bloqueado={fechadoDepois} />
      </section>
    </div>
  );
}
