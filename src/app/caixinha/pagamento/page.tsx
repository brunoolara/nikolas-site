// Pagar vários dias de uma vez: escolhe o início e o fim, confere dia a dia
// e fecha tudo num pagamento só (o saldo negativo conta uma vez, no total).
// Com ?id= mostra um pagamento já feito.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { DATA, hoje, rotuloData, somarDias } from "@/lib/posts/tipos";
import { lerDia, lerEquipe, lerEstado, lerPagamento } from "@/lib/caixinha/armazem";
import { taxasDoPeriodo } from "@/lib/caixinha/takeat";
import {
  diasEntre,
  MAX_DIAS_PAGAMENTO,
  PAGAMENTO_ID,
  PARTE_EQUIPE,
  partesDoDia,
  reais,
  ROTULO_TURNO,
  somarPagamento,
  TURNOS,
  type Turno,
} from "@/lib/caixinha/tipos";
import Abas from "../Abas";
import EscolherPeriodo from "../EscolherPeriodo";
import TabelaPagamento from "../TabelaPagamento";
import Comprovantes from "../Comprovantes";
import { FecharPeriodo, ReabrirPagamento } from "./Botoes";

const linkDia = (d: string) => (d === hoje() ? "/caixinha" : `/caixinha?dia=${d}`);

/** "seg, 09/11" — para listas. */
const curto = (d: string) => rotuloData(d).replace(/^(\S{3})\S*,/, "$1,");

function segundaDe(d: string) {
  const [a, m, n] = d.split("-").map(Number);
  const semana = new Date(Date.UTC(a, m - 1, n)).getUTCDay();
  return somarDias(d, -((semana + 6) % 7));
}

export default async function Pagamento({ searchParams }: PageProps<"/caixinha/pagamento">) {
  const { sessao, liberado } = await exigir("caixinha");
  if (!liberado) return null;
  const busca = await searchParams;
  const estado = await lerEstado();
  const dia = hoje();

  const id = typeof busca.id === "string" && PAGAMENTO_ID.test(busca.id) ? busca.id : null;
  if (id) return <PagamentoFeito id={id} master={sessao.master} ultimoFechado={estado.ultimoFechado} />;

  // padrão: do dia seguinte ao último pago até hoje
  const desdeUltimo = estado.ultimoFechado && estado.ultimoFechado < dia ? somarDias(estado.ultimoFechado, 1) : dia;
  let ini = typeof busca.ini === "string" && DATA.test(busca.ini) ? busca.ini : desdeUltimo;
  let fim = typeof busca.fim === "string" && DATA.test(busca.fim) ? busca.fim : dia;
  if (fim > dia) fim = dia;
  if (ini > fim) [ini, fim] = [fim, ini];
  const datas = diasEntre(ini, fim);

  const problemas: string[] = [];
  if (datas.length > MAX_DIAS_PAGAMENTO) problemas.push(`Um pagamento cobre no máximo ${MAX_DIAS_PAGAMENTO} dias.`);
  if (estado.ultimoFechado && ini <= estado.ultimoFechado)
    problemas.push(
      `O período começa num dia já pago: o último pagamento foi até ${rotuloData(estado.ultimoFechado)}. Comece em ${rotuloData(somarDias(estado.ultimoFechado, 1))}.`,
    );

  const usados = datas.slice(0, MAX_DIAS_PAGAMENTO);
  const [dias, equipe] = await Promise.all([Promise.all(usados.map(lerDia)), lerEquipe()]);
  const abertos = dias.filter((d) => !d.fechamento);
  const precisam = abertos.filter((d) => TURNOS.some((t) => d.turnos[t].taxaManual === null)).map((d) => d.data);
  const takeat = precisam.length && !problemas.length ? await taxasDoPeriodo(precisam) : new Map();

  // dia a dia: taxa de cada turno, quem trabalhou e o que impede de fechar
  const resumo = dias.map((d) => {
    const tk = takeat.get(d.data);
    const taxa = {} as Record<Turno, number>;
    const avisos: string[] = [];
    for (const t of TURNOS) {
      const manual = d.fechamento ? d.fechamento.taxa[t] : d.turnos[t].taxaManual;
      const ninguem = !d.turnos[t].presencas.some((p) => p.pct > 0);
      taxa[t] = manual ?? (tk?.ok ? tk.taxa[t] : 0);
      if (d.fechamento) continue;
      if (manual === null && !tk?.ok && !ninguem) avisos.push(`${ROTULO_TURNO[t]} sem a taxa da Takeat: digite à mão`);
      if (ninguem && taxa[t] > 0) avisos.push(`${ROTULO_TURNO[t]} com taxa e ninguém marcado`);
    }
    return { dia: d, taxa, avisos, partes: partesDoDia(d, taxa, equipe) };
  });
  const fechados = resumo.filter((r) => r.dia.fechamento);
  if (fechados.length && !problemas.length)
    problemas.push(`O período tem dia já pago (${fechados.map((r) => curto(r.dia.data)).join(", ")}).`);
  const comAviso = resumo.filter((r) => r.avisos.length);

  const linhas = somarPagamento(
    resumo.map((r) => r.partes),
    estado.saldos,
  );
  const taxaTotal = resumo.reduce((s, r) => s + r.taxa.almoco + r.taxa.jantar, 0);
  const total = linhas.reduce((s, l) => s + l.pagar, 0);
  const podeFechar = !problemas.length && !comAviso.length && datas.length > 0;

  const ontem = somarDias(dia, -1);
  const atalhos = [
    ...(estado.ultimoFechado && estado.ultimoFechado < dia ? [{ rotulo: "Desde o último pagamento", ini: desdeUltimo, fim: dia }] : []),
    { rotulo: "Esta semana", ini: segundaDe(dia), fim: dia },
    { rotulo: "Semana passada", ini: somarDias(segundaDe(dia), -7), fim: somarDias(segundaDe(dia), -1) },
    { rotulo: "Últimos 7 dias", ini: somarDias(dia, -6), fim: dia },
    { rotulo: "Ontem", ini: ontem, fim: ontem },
  ];
  const anteriores = [...(estado.pagamentos ?? [])].reverse().slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Caixinha"
        descricao="Escolha o primeiro e o último dia para pagar vários dias juntos. O consumo e o saldo de cada um contam no total do período."
      />
      <Abas atual="pagamento" master={sessao.master} />
      <EscolherPeriodo acao="/caixinha/pagamento" ini={ini} fim={fim} max={dia} atalhos={atalhos} />

      {problemas.map((p) => (
        <p key={p} className="p-aviso p-aviso-alerta mt-4">
          {p}
        </p>
      ))}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero titulo="Dias" valor={String(datas.length)} sub={`${rotuloData(ini)} a ${rotuloData(fim)}`} />
        <Numero titulo="Taxa de serviço" valor={reais(taxaTotal)} sub="almoço + jantar" />
        <Numero titulo="Para a equipe" valor={reais(taxaTotal * PARTE_EQUIPE)} sub="A parte da equipe na taxa" />
        <Numero titulo="A pagar" valor={reais(total)} sub="já sem consumo e saldo" destaque />
      </div>

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Dia a dia</h3>
        <ul className="mt-2 divide-y divide-linha/70 text-sm">
          {resumo.map((r) => {
            const pessoas = new Set(TURNOS.flatMap((t) => r.dia.turnos[t].presencas.filter((p) => p.pct > 0).map((p) => p.id)));
            const consumo = r.dia.consumos.reduce((s, c) => s + c.valor, 0);
            return (
              <li key={r.dia.data} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <Link href={linkDia(r.dia.data)} className="font-semibold text-verde hover:underline first-letter:uppercase">
                  {curto(r.dia.data)}
                </Link>
                <span className="tabular-nums text-cafe">
                  Almoço {reais(r.taxa.almoco)} · Jantar {reais(r.taxa.jantar)} · {pessoas.size}{" "}
                  {pessoas.size === 1 ? "pessoa" : "pessoas"}
                  {consumo ? ` · consumo ${reais(consumo)}` : ""}
                </span>
                {r.dia.fechamento ? (
                  <span className="p-selo basis-full sm:basis-auto">já pago</span>
                ) : r.avisos.length ? (
                  <span className="basis-full text-xs font-semibold text-[var(--p-vermelho)]">{r.avisos.join(" · ")}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Pagamento do período</h3>
        {linhas.length ? (
          <TabelaPagamento modo="pagamento" linhas={linhas} />
        ) : (
          <p className="mt-2 text-sm text-cafe">Ninguém marcado nesses dias ainda.</p>
        )}
        {podeFechar ? (
          <FecharPeriodo ini={ini} fim={fim} dias={datas.length} total={reais(total)} />
        ) : comAviso.length && !problemas.length ? (
          <p className="mt-5 border-t border-linha/70 pt-4 text-sm text-cafe">
            Acerte os dias marcados em vermelho acima para poder fechar.
          </p>
        ) : null}
      </section>

      {anteriores.length ? (
        <section className="p-cartao mt-6 p-5">
          <h3 className="p-cartao-titulo">Pagamentos feitos</h3>
          <ul className="mt-2 divide-y divide-linha/70 text-sm">
            {anteriores.map((p) => (
              <li key={p} className="py-2">
                <Link href={`/caixinha/pagamento?id=${p}`} className="font-semibold text-verde hover:underline">
                  {p.slice(0, 10) === p.slice(11) ? curto(p.slice(0, 10)) : `${curto(p.slice(0, 10))} a ${curto(p.slice(11))}`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Numero({ titulo, valor, sub, destaque }: { titulo: string; valor: string; sub: string; destaque?: boolean }) {
  return (
    <div className={`p-cartao p-4 ${destaque ? "border-verde/40 bg-[var(--p-verde-fundo)]" : ""}`}>
      <p className="p-kpi-rotulo">{titulo}</p>
      <p className="p-kpi-valor">{valor}</p>
      <p className="mt-0.5 text-xs text-cafe">{sub}</p>
    </div>
  );
}

async function PagamentoFeito({ id, master, ultimoFechado }: { id: string; master: boolean; ultimoFechado: string | null }) {
  const pag = await lerPagamento(id);
  const voltar = (
    <>
      <Cabecalho titulo="Caixinha" />
      <Abas atual="pagamento" master={master} />
    </>
  );
  if (!pag)
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {voltar}
        <p className="p-aviso p-aviso-info mt-4">
          Este pagamento não existe mais (foi reaberto).{" "}
          <Link href="/caixinha/pagamento" className="font-semibold underline">
            Escolher o período
          </Link>
        </p>
      </div>
    );

  const dias = await Promise.all(pag.dias.map(lerDia));
  const taxaTotal = dias.reduce((s, d) => s + (d.fechamento ? d.fechamento.taxa.almoco + d.fechamento.taxa.jantar : 0), 0);
  const total = pag.linhas.reduce((s, l) => s + l.pagar, 0);
  const consumo = pag.linhas.reduce((s, l) => s + l.consumo, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      {voltar}
      <h2 className="mt-6 font-display text-2xl first-letter:uppercase">
        {pag.ini === pag.fim ? rotuloData(pag.ini) : `${rotuloData(pag.ini)} a ${rotuloData(pag.fim)}`}
      </h2>
      <p className="p-aviso p-aviso-ok mt-3">
        Pago por {pag.por} em {new Date(pag.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero titulo="Dias" valor={String(pag.dias.length)} sub="no pagamento" />
        <Numero titulo="Taxa de serviço" valor={reais(taxaTotal)} sub="almoço + jantar" />
        <Numero titulo="Consumo descontado" valor={reais(consumo)} sub="da equipe" />
        <Numero titulo="Pago" valor={reais(total)} sub={`${pag.linhas.filter((l) => l.pagar > 0).length} pessoas`} destaque />
      </div>

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Quanto cada um recebeu</h3>
        <TabelaPagamento modo="pagamento" linhas={pag.linhas} pago />
        {ultimoFechado === pag.fim ? <ReabrirPagamento id={pag.id} dias={pag.dias.length} /> : null}
      </section>

      <Comprovantes id={pag.id} linhas={pag.linhas} />

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Dias do pagamento</h3>
        <ul className="mt-2 divide-y divide-linha/70 text-sm">
          {dias.map((d) => (
            <li key={d.data} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link href={linkDia(d.data)} className="font-semibold text-verde hover:underline first-letter:uppercase">
                {curto(d.data)}
              </Link>
              <span className="tabular-nums text-cafe">
                Almoço {reais(d.fechamento?.taxa.almoco ?? 0)} · Jantar {reais(d.fechamento?.taxa.jantar ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
