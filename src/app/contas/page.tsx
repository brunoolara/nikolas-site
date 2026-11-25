// Contas a pagar, lidas da Takeat. Duas abas pelo endereço:
// - A pagar (padrão): vencidas, hoje e próximos dias, com "Copiar código" e "Paguei";
// - Por mês (?ver=mes&mes=AAAA-MM): quanto vai para cada categoria no mês,
//   pago e a pagar, e as compras sem nota fiscal.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { hoje, somarDias } from "@/lib/posts/tipos";
import { reais } from "@/lib/caixinha/tipos";
import { DIAS_ATRAS, lerAbertas, lerMes, lerOpcoes, type Conta } from "@/lib/contas/takeat";
import { mensagemDe } from "@/lib/takeat/cliente";
import Lista from "./Lista";

export const maxDuration = 60;

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

const mesVizinho = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const nomeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
};
const soma = (contas: Conta[]) => contas.reduce((s, c) => s + c.valor, 0);

export default async function Contas({ searchParams }: PageProps<"/contas">) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("contas")).liberado) return null;
  const busca = await searchParams;
  const dia = hoje();
  const porMes = busca.ver === "mes";
  const mes = typeof busca.mes === "string" && MES.test(busca.mes) ? busca.mes : dia.slice(0, 7);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Contas a pagar"
        descricao="O que está lançado na Takeat. Conta que não aparece aqui ainda não foi lançada: lance antes de pagar."
      />
      <nav className="p-abas mt-6" aria-label="Visões">
        <Link href="/contas" className="p-aba" aria-current={porMes ? undefined : "page"}>
          A pagar
        </Link>
        <Link href={`/contas?ver=mes&mes=${mes}`} className="p-aba" aria-current={porMes ? "page" : undefined}>
          Por mês
        </Link>
      </nav>
      {porMes ? <PorMes mes={mes} dia={dia} /> : <APagar dia={dia} />}
    </div>
  );
}

async function APagar({ dia }: { dia: string }) {
  let dados: [Awaited<ReturnType<typeof lerAbertas>>, Awaited<ReturnType<typeof lerOpcoes>>];
  try {
    dados = await Promise.all([lerAbertas(), lerOpcoes()]);
  } catch (erro) {
    return (
      <p role="alert" className="p-aviso p-aviso-erro mt-6">
        {mensagemDe(erro)}
      </p>
    );
  }
  const [{ contas, antigas }, opcoes] = dados;
  const vencidas = contas.filter((c) => c.vencimento < dia);
  const deHoje = contas.filter((c) => c.vencimento === dia);
  const semana = contas.filter((c) => c.vencimento > dia && c.vencimento <= somarDias(dia, 7));
  const mes30 = contas.filter((c) => c.vencimento >= dia && c.vencimento <= somarDias(dia, 30));

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Vencidas" valor={soma(vencidas)} n={vencidas.length} alerta={vencidas.length > 0} />
        <Kpi rotulo="Hoje" valor={soma(deHoje)} n={deHoje.length} />
        <Kpi rotulo="Próximos 7 dias" valor={soma(semana)} n={semana.length} />
        <Kpi rotulo="Até 30 dias" valor={soma(mes30)} n={mes30.length} />
      </div>

      {antigas.quantas ? (
        <p className="p-aviso p-aviso-alerta mt-4">
          Há {antigas.quantas} {antigas.quantas === 1 ? "conta vencida" : "contas vencidas"} há mais de {DIAS_ATRAS} dias
          ainda em aberto na Takeat ({reais(antigas.valor)}). Elas não aparecem aqui porque o mais provável é que já tenham
          sido pagas sem baixa. Confira no extrato antes de pagar de novo.
        </p>
      ) : null}

      <Lista contas={contas} bancos={opcoes.contas} formas={opcoes.formas} hoje={dia} />
    </>
  );
}

function Kpi({ rotulo, valor, n, alerta }: { rotulo: string; valor: number; n: number; alerta?: boolean }) {
  return (
    <div className="p-cartao p-4">
      <p className="p-kpi-rotulo">{rotulo}</p>
      <p className={`p-kpi-valor ${alerta ? "text-[var(--p-vermelho)]" : ""}`}>{reais(valor)}</p>
      <p className="mt-0.5 text-xs text-cafe">
        {n} {n === 1 ? "conta" : "contas"}
      </p>
    </div>
  );
}

type Linha = { nome: string; pago: number; aberto: number };

async function PorMes({ mes, dia }: { mes: string; dia: string }) {
  let contas: Conta[];
  try {
    contas = await lerMes(mes);
  } catch (erro) {
    return (
      <p role="alert" className="p-aviso p-aviso-erro mt-6">
        {mensagemDe(erro)}
      </p>
    );
  }

  // categoria "Grupo: Subcategoria" → grupo com as subcategorias dentro
  const grupos = new Map<string, Map<string, Linha>>();
  for (const c of contas)
    for (const cat of c.categorias) {
      const [grupo, ...resto] = cat.nome.split(":");
      const sub = resto.join(":").trim() || grupo.trim();
      const subs = grupos.get(grupo.trim()) ?? new Map<string, Linha>();
      const l = subs.get(sub) ?? { nome: sub, pago: 0, aberto: 0 };
      if (c.pago) l.pago += cat.valor;
      else l.aberto += cat.valor;
      subs.set(sub, l);
      grupos.set(grupo.trim(), subs);
    }
  const tabela = [...grupos]
    .map(([nome, subs]) => {
      const linhas = [...subs.values()].sort((a, b) => b.pago + b.aberto - (a.pago + a.aberto));
      return {
        nome,
        linhas,
        pago: linhas.reduce((s, l) => s + l.pago, 0),
        aberto: linhas.reduce((s, l) => s + l.aberto, 0),
      };
    })
    .sort((a, b) => b.pago + b.aberto - (a.pago + a.aberto));

  const pagas = contas.filter((c) => c.pago);
  const abertas = contas.filter((c) => !c.pago);
  const vencidas = abertas.filter((c) => c.vencimento < dia);
  const semNota = contas.filter((c) => !c.nota);

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-2">
        <Link href={`/contas?ver=mes&mes=${mesVizinho(mes, -1)}`} className="p-btn p-btn-fantasma p-btn-sm" aria-label="Mês anterior">
          ←
        </Link>
        <h2 className="font-display text-2xl first-letter:uppercase">{nomeMes(mes)}</h2>
        <Link href={`/contas?ver=mes&mes=${mesVizinho(mes, 1)}`} className="p-btn p-btn-fantasma p-btn-sm" aria-label="Próximo mês">
          →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Total do mês" valor={soma(contas)} n={contas.length} />
        <Kpi rotulo="Pago" valor={soma(pagas)} n={pagas.length} />
        <Kpi rotulo="A pagar" valor={soma(abertas)} n={abertas.length} />
        <Kpi rotulo="Vencidas sem baixa" valor={soma(vencidas)} n={vencidas.length} alerta={vencidas.length > 0} />
      </div>
      <p className="mt-3 text-sm text-cafe">
        Pelo vencimento, como a Takeat. Só entra o que foi lançado lá: compra paga sem lançamento não aparece.
      </p>

      {tabela.length ? (
        <section className="p-cartao mt-6 overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 border-b border-linha px-4 py-3 text-sm font-semibold text-cafe">
            <span>Categoria</span>
            <span>Total · pago / a pagar</span>
          </div>
          {tabela.map((g) => (
            <details key={g.nome} className="group border-b border-linha/70 last:border-0">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">
                  <span className="mr-1 inline-block text-cafe transition-transform group-open:rotate-90">›</span>
                  {g.nome}
                </span>
                <Valores pago={g.pago} aberto={g.aberto} forte />
              </summary>
              <ul className="pb-2">
                {g.linhas.map((l) => (
                  <li key={l.nome} className="flex items-baseline justify-between gap-3 px-4 py-1.5 pl-9 text-sm">
                    <span>{l.nome}</span>
                    <Valores pago={l.pago} aberto={l.aberto} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      ) : (
        <p className="mt-8 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">
          Nada lançado na Takeat com vencimento neste mês.
        </p>
      )}

      {semNota.length ? (
        <details className="p-cartao mt-6 overflow-hidden">
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="font-semibold">
              Sem nota fiscal
              <span className="ml-2 text-sm font-normal text-cafe">
                {semNota.length} {semNota.length === 1 ? "lançamento" : "lançamentos"} · ver
              </span>
            </span>
            <span className="font-semibold tabular-nums">{reais(soma(semNota))}</span>
          </summary>
          <ul className="divide-y divide-linha/70 border-t border-linha">
            {semNota.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{c.titulo}</span>
                  <span className="block text-xs text-cafe">
                    {c.vencimento.slice(8, 10)}/{c.vencimento.slice(5, 7)}
                    {c.forma ? ` · ${c.forma}` : ""}
                    {c.categorias[0] ? ` · ${c.categorias[0].nome}` : ""}
                    {c.pago ? " · pago" : " · em aberto"}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{reais(c.valor)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function Valores({ pago, aberto, forte }: { pago: number; aberto: number; forte?: boolean }) {
  return (
    <span className="shrink-0 text-right tabular-nums">
      <span className={forte ? "font-semibold" : ""}>{reais(pago + aberto)}</span>
      <span className="block text-xs text-cafe">
        {reais(pago)} / {reais(aberto)}
      </span>
    </span>
  );
}
