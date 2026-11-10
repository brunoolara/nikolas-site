// Relatório da Caixinha, só para os donos: os números do período escolhido,
// comparados com o período anterior do mesmo tamanho. Entram só os dias
// fechados (os abertos ainda podem mudar).

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { DATA, hoje, rotuloData, somarDias } from "@/lib/posts/tipos";
import { lerDia, lerEstado, lerPagamento } from "@/lib/caixinha/armazem";
import { diasEntre, PARTE_EQUIPE, reais, type Dia } from "@/lib/caixinha/tipos";
import Abas from "../Abas";
import EscolherPeriodo from "../EscolherPeriodo";

const MAX_DIAS = 92;

const curto = (d: string) => rotuloData(d).replace(/^(\S{3})\S*,/, "$1,");
const pct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function segundaDe(d: string) {
  const [a, m, n] = d.split("-").map(Number);
  return somarDias(d, -((new Date(Date.UTC(a, m - 1, n)).getUTCDay() + 6) % 7));
}

/** Os números de um conjunto de dias fechados. */
function apurar(dias: Dia[]) {
  const fechados = dias.filter((d) => d.fechamento);
  let almoco = 0;
  let jantar = 0;
  let consumo = 0;
  let turnosComTaxa = { almoco: 0, jantar: 0 };
  let turnosPessoa = 0;
  const pessoas = new Map<string, { nome: string; almoco: number; jantar: number; turnosA: number; turnosJ: number; consumo: number }>();
  for (const d of fechados) {
    const f = d.fechamento!;
    almoco += f.taxa.almoco;
    jantar += f.taxa.jantar;
    if (f.taxa.almoco > 0) turnosComTaxa = { ...turnosComTaxa, almoco: turnosComTaxa.almoco + 1 };
    if (f.taxa.jantar > 0) turnosComTaxa = { ...turnosComTaxa, jantar: turnosComTaxa.jantar + 1 };
    for (const p of f.partes) {
      const x = pessoas.get(p.pessoa) ?? { nome: p.nome, almoco: 0, jantar: 0, turnosA: 0, turnosJ: 0, consumo: 0 };
      x.almoco += p.almoco;
      x.jantar += p.jantar;
      x.consumo += p.consumo;
      consumo += p.consumo;
      pessoas.set(p.pessoa, x);
    }
    for (const p of d.turnos.almoco.presencas.filter((p) => p.pct > 0)) {
      const x = pessoas.get(p.id);
      if (x) x.turnosA += 1;
      turnosPessoa += 1;
    }
    for (const p of d.turnos.jantar.presencas.filter((p) => p.pct > 0)) {
      const x = pessoas.get(p.id);
      if (x) x.turnosJ += 1;
      turnosPessoa += 1;
    }
  }
  const taxa = almoco + jantar;
  const equipe = taxa * PARTE_EQUIPE;
  return {
    fechados,
    // dia aberto só conta se teve alguém marcado ou consumo (dia vazio não pesa)
    abertos: dias.filter(
      (d) => !d.fechamento && (d.consumos.length || d.turnos.almoco.presencas.length || d.turnos.jantar.presencas.length),
    ).length,
    almoco,
    jantar,
    taxa,
    equipe,
    consumo,
    turnosComTaxa,
    turnosPessoa,
    pessoas: [...pessoas.entries()].sort((a, b) => b[1].almoco + b[1].jantar - (a[1].almoco + a[1].jantar)),
  };
}

function Variacao({ atual, antes }: { atual: number; antes: number }) {
  if (!antes) return null;
  const d = (atual - antes) / Math.abs(antes);
  if (Math.abs(d) < 0.005) return <span className="text-xs text-cafe">≈ igual ao período anterior</span>;
  return (
    <span className="text-xs text-cafe">
      {d > 0 ? "▲" : "▼"} {pct(Math.abs(d))} vs período anterior
    </span>
  );
}

function Numero(props: { titulo: string; valor: string; sub?: React.ReactNode; alerta?: boolean }) {
  return (
    <div className="p-cartao p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cafe">{props.titulo}</p>
      <p className={`mt-1 font-display text-2xl tabular-nums sm:text-3xl ${props.alerta ? "text-[var(--p-vermelho)]" : ""}`}>
        {props.valor}
      </p>
      {props.sub ? <div className="mt-0.5 text-xs text-cafe">{props.sub}</div> : null}
    </div>
  );
}

export default async function Relatorio({ searchParams }: PageProps<"/caixinha/relatorio">) {
  const { sessao, liberado } = await exigir("caixinha");
  if (!liberado) return null;
  if (!sessao.master)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Cabecalho titulo="Caixinha" />
        <Abas atual="relatorio" master={false} />
        <p className="p-aviso p-aviso-info mt-4">O relatório da Caixinha é só para os donos.</p>
      </div>
    );

  const busca = await searchParams;
  const dia = hoje();
  const inicioMes = `${dia.slice(0, 7)}-01`;
  let ini = typeof busca.ini === "string" && DATA.test(busca.ini) ? busca.ini : inicioMes;
  let fim = typeof busca.fim === "string" && DATA.test(busca.fim) ? busca.fim : dia;
  if (fim > dia) fim = dia;
  if (ini > fim) [ini, fim] = [fim, ini];
  let datas = diasEntre(ini, fim);
  const cortado = datas.length > MAX_DIAS;
  if (cortado) {
    datas = datas.slice(-MAX_DIAS);
    ini = datas[0];
  }
  // período anterior do mesmo tamanho, logo antes
  const antesFim = somarDias(ini, -1);
  const antesDatas = diasEntre(somarDias(antesFim, -(datas.length - 1)), antesFim);

  const [dias, diasAntes, estado] = await Promise.all([
    Promise.all(datas.map(lerDia)),
    Promise.all(antesDatas.map(lerDia)),
    lerEstado(),
  ]);
  const r = apurar(dias);
  const a = apurar(diasAntes);

  const pagamentos = (
    await Promise.all((estado.pagamentos ?? []).filter((p) => p.slice(11) >= ini && p.slice(11) <= fim).map(lerPagamento))
  ).filter((p) => p !== null);
  const pagoTotal = pagamentos.reduce((s, p) => s + p.linhas.reduce((x, l) => x + l.pagar, 0), 0);

  const devedores = Object.entries(estado.saldos).filter(([, v]) => v < 0);
  const divida = devedores.reduce((s, [, v]) => s - v, 0);
  const nomeDe = new Map<string, string>();
  for (const d of [...dias, ...diasAntes]) for (const p of d.fechamento?.partes ?? []) nomeDe.set(p.pessoa, p.nome);
  for (const p of pagamentos) for (const l of p.linhas) nomeDe.set(l.pessoa, l.nome);

  const vazamento = r.equipe ? r.consumo / r.equipe : null;
  const vazamentoAntes = a.equipe ? a.consumo / a.equipe : null;
  const mediaDia = r.fechados.length ? r.taxa / r.fechados.length : 0;
  const mediaTurnoPessoa = r.turnosPessoa ? r.equipe / r.turnosPessoa : 0;

  const mesPassadoFim = somarDias(inicioMes, -1);
  const atalhos = [
    { rotulo: "Este mês", ini: inicioMes, fim: dia },
    { rotulo: "Mês passado", ini: `${mesPassadoFim.slice(0, 7)}-01`, fim: mesPassadoFim },
    { rotulo: "Esta semana", ini: segundaDe(dia), fim: dia },
    { rotulo: "Últimos 30 dias", ini: somarDias(dia, -29), fim: dia },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho titulo="Caixinha" descricao="Os números da caixinha no período, só com os dias fechados." />
      <Abas atual="relatorio" master />
      <EscolherPeriodo acao="/caixinha/relatorio" ini={ini} fim={fim} max={dia} atalhos={atalhos} />

      {cortado ? (
        <p className="p-aviso p-aviso-info mt-4">O relatório mostra no máximo {MAX_DIAS} dias: ficaram os mais recentes.</p>
      ) : null}
      {r.abertos ? (
        <p className="p-aviso p-aviso-info mt-4">
          {r.abertos} {r.abertos === 1 ? "dia do período ainda está aberto e não entra" : "dias do período ainda estão abertos e não entram"} nos números.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          titulo="Taxa de serviço"
          valor={reais(r.taxa)}
          sub={
            <>
              <p>
                Almoço {reais(r.almoco)} · Jantar {reais(r.jantar)}
              </p>
              <Variacao atual={r.taxa} antes={a.taxa} />
            </>
          }
        />
        <Numero
          titulo="Para a equipe"
          valor={reais(r.equipe)}
          sub={
            <>
              <p>90% · casa fica com {reais(r.taxa - r.equipe)}</p>
              <p>Pago no período: {reais(pagoTotal)}</p>
            </>
          }
        />
        <Numero
          titulo="Consumo descontado"
          valor={reais(r.consumo)}
          sub={
            <>
              <p>{pct(vazamento)} da parte da equipe</p>
              {vazamento !== null && vazamentoAntes !== null ? (
                <p>
                  {vazamento > vazamentoAntes ? "▲" : "▼"} {Math.abs((vazamento - vazamentoAntes) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                  p.p. vs período anterior
                </p>
              ) : null}
            </>
          }
        />
        <Numero
          titulo="Dívida em aberto hoje"
          valor={reais(divida)}
          alerta={divida > 0}
          sub={`${devedores.length} ${devedores.length === 1 ? "pessoa devendo" : "pessoas devendo"}`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero titulo="Média por dia" valor={reais(mediaDia)} sub={`de taxa, em ${r.fechados.length} dias fechados`} />
        <Numero
          titulo="Média do almoço"
          valor={reais(r.turnosComTaxa.almoco ? r.almoco / r.turnosComTaxa.almoco : 0)}
          sub={`por turno, ${r.turnosComTaxa.almoco} turnos`}
        />
        <Numero
          titulo="Média do jantar"
          valor={reais(r.turnosComTaxa.jantar ? r.jantar / r.turnosComTaxa.jantar : 0)}
          sub={`por turno, ${r.turnosComTaxa.jantar} turnos`}
        />
        <Numero titulo="Por pessoa e turno" valor={reais(mediaTurnoPessoa)} sub={`média recebida, ${r.turnosPessoa} turnos trabalhados`} />
      </div>

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Por pessoa</h3>
        {r.pessoas.length ? (
          <div className="p-rolagem mt-3 overflow-x-auto">
            <table className="p-tabela">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th className="num">Turnos</th>
                  <th className="num">Da taxa</th>
                  <th className="num">Consumo</th>
                  <th className="num">Líquido</th>
                  <th className="num">Por turno</th>
                </tr>
              </thead>
              <tbody>
                {r.pessoas.map(([id, p]) => {
                  const taxa = p.almoco + p.jantar;
                  const turnos = p.turnosA + p.turnosJ;
                  return (
                    <tr key={id}>
                      <td className="font-medium">
                        {p.nome}
                        {estado.saldos[id] ? (
                          <span className="block text-xs text-red-700">deve {reais(-estado.saldos[id])} hoje</span>
                        ) : null}
                      </td>
                      <td className="num whitespace-nowrap">
                        {turnos}
                        <span className="block text-xs text-cafe">
                          {p.turnosA} alm · {p.turnosJ} jan
                        </span>
                      </td>
                      <td className="num">{reais(taxa)}</td>
                      <td className="num">{p.consumo ? `− ${reais(p.consumo)}` : "—"}</td>
                      <td className="num font-semibold">{reais(taxa - p.consumo)}</td>
                      <td className="num">{turnos ? reais(taxa / turnos) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-cafe">Nenhum dia fechado neste período.</p>
        )}
      </section>

      {devedores.length ? (
        <section className="p-cartao mt-6 p-5">
          <h3 className="p-cartao-titulo">Quem está devendo hoje</h3>
          <ul className="mt-2 divide-y divide-linha/70 text-sm">
            {devedores
              .sort((x, y) => x[1] - y[1])
              .map(([id, v]) => (
                <li key={id} className="flex justify-between py-2">
                  <span>{nomeDe.get(id) ?? "Pessoa da equipe"}</span>
                  <span className="font-semibold tabular-nums text-red-700">{reais(-v)}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {r.fechados.length ? (
        <section className="p-cartao mt-6 p-5">
          <h3 className="p-cartao-titulo">Dia a dia</h3>
          <div className="p-rolagem mt-3 overflow-x-auto">
            <table className="p-tabela">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th className="num">Almoço</th>
                  <th className="num">Jantar</th>
                  <th className="num">Pessoas</th>
                  <th className="num">Consumo</th>
                </tr>
              </thead>
              <tbody>
                {r.fechados.map((d) => {
                  const f = d.fechamento!;
                  const consumo = f.partes.reduce((s, p) => s + p.consumo, 0);
                  return (
                    <tr key={d.data}>
                      <td>
                        <Link href={d.data === dia ? "/caixinha" : `/caixinha?dia=${d.data}`} className="font-medium text-verde hover:underline first-letter:uppercase">
                          {curto(d.data)}
                        </Link>
                      </td>
                      <td className="num">{reais(f.taxa.almoco)}</td>
                      <td className="num">{reais(f.taxa.jantar)}</td>
                      <td className="num">{f.partes.filter((p) => p.almoco + p.jantar > 0).length}</td>
                      <td className="num">{consumo ? reais(consumo) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {pagamentos.length ? (
        <section className="p-cartao mt-6 p-5">
          <h3 className="p-cartao-titulo">Pagamentos no período</h3>
          <ul className="mt-2 divide-y divide-linha/70 text-sm">
            {pagamentos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/caixinha/pagamento?id=${p.id}`} className="font-semibold text-verde hover:underline">
                  {p.ini === p.fim ? curto(p.ini) : `${curto(p.ini)} a ${curto(p.fim)}`}
                </Link>
                <span className="tabular-nums text-cafe">
                  {reais(p.linhas.reduce((s, l) => s + l.pagar, 0))} · por {p.por}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
