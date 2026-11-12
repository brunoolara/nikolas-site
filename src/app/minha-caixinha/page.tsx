// A caixinha do funcionário do login: o que tem a receber, os turnos em que
// trabalhou (com a taxa do turno e a parte dele), o consumo e os pagamentos.

import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { rotuloData } from "@/lib/posts/tipos";
import { dataCompleta } from "@/lib/caixinha/comprovante";
import { DIAS_MINHA, lerMinhaCaixinha, type MeuDia, type MeuPagamento } from "@/lib/caixinha/minha";
import { reais, ROTULO_TURNO } from "@/lib/caixinha/tipos";

const curta = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);

export default async function MinhaCaixinha() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const { sessao, liberado } = await exigir("minha-caixinha");
  if (!liberado) return null;

  if (!sessao.pessoa)
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Cabecalho titulo="Minha caixinha" />
        <p className="p-aviso p-aviso-info mt-4 max-w-xl">
          Seu login ainda não está ligado a ninguém da equipe da Caixinha. Peça ao Bruno para ligar.
        </p>
      </div>
    );

  const m = await lerMinhaCaixinha(sessao.pessoa);
  const a = m.aberto;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Minha caixinha"
        descricao={`Os turnos em que você trabalhou e o seu consumo, de ${curta(m.ini)} a ${curta(m.fim)} (últimos ${DIAS_MINHA} dias).`}
      />

      <div className="mt-6 grid max-w-xl gap-4">
        {a ? (
          <section className="p-cartao p-5">
            <p className="p-kpi-rotulo">A receber</p>
            <p className="p-kpi-valor mt-1 tabular-nums">{reais(a.pagar)}</p>
            <p className="mt-1 text-sm text-cafe">
              Dos turnos ainda não fechados. O valor pode mudar até o fechamento.
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-linha/70 pt-3 text-sm">
              {a.almoco ? <Item rotulo="Almoço" valor={reais(a.almoco)} /> : null}
              {a.jantar ? <Item rotulo="Jantar" valor={reais(a.jantar)} /> : null}
              {a.consumo ? <Item rotulo="Consumo descontado" valor={`− ${reais(a.consumo)}`} /> : null}
              {a.saldoAnterior ? <Item rotulo="Saldo anterior" valor={`− ${reais(-a.saldoAnterior)}`} /> : null}
            </dl>
            {a.novoSaldo < 0 ? (
              <p className="mt-2 text-sm text-cafe">Fica para descontar no próximo pagamento: {reais(-a.novoSaldo)}</p>
            ) : null}
          </section>
        ) : m.saldo < 0 ? (
          <p className="p-aviso p-aviso-info">
            Consumo para descontar no próximo pagamento: <strong>{reais(-m.saldo)}</strong>
          </p>
        ) : null}

        <section>
          <h2 className="font-display text-2xl">Dia a dia</h2>
          {m.dias.length ? (
            <div className="mt-3 grid gap-3">
              {m.dias.map((d) => (
                <CartaoDia key={d.data} dia={d} />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">
              Nenhum turno seu nos últimos {DIAS_MINHA} dias.
            </p>
          )}
        </section>

        {m.pagamentos.length ? (
          <section>
            <h2 className="font-display text-2xl">Pagamentos recebidos</h2>
            <ul className="p-cartao mt-3 divide-y divide-linha/70">
              {m.pagamentos.map((p) => (
                <LinhaPagamento key={p.id} pagamento={p} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function CartaoDia({ dia }: { dia: MeuDia }) {
  return (
    <article className="p-cartao p-4">
      <h3 className="font-semibold first-letter:uppercase">{rotuloData(dia.data)}</h3>
      <ul className="mt-2 divide-y divide-linha/70">
        {dia.turnos.map((t) => (
          <li key={t.turno} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <strong>{ROTULO_TURNO[t.turno]}</strong>
                {t.pagamento ? (
                  <span className="p-selo p-selo-verde">Pago</span>
                ) : (
                  <span className="p-selo">Em aberto</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-cafe">
                {t.taxa === null ? "Taxa do turno ainda não chegou da Takeat" : `Taxa do turno ${reais(t.taxa)}`}
                {t.pct !== 100 ? ` · ${t.pct === 50 ? "meia parte" : `${t.pct}% da parte`}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-cafe">Sua parte</p>
              <p className="font-semibold tabular-nums">{reais(t.parte)}</p>
            </div>
          </li>
        ))}
        {dia.consumos.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p>
                Consumo{c.descricao ? `: ${c.descricao}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-cafe">
                Descontado no {ROTULO_TURNO[c.turno].toLowerCase()}
                {c.aberto ? " · em aberto" : ""}
              </p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">− {reais(c.valor)}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}

function LinhaPagamento({ pagamento: p }: { pagamento: MeuPagamento }) {
  const periodo =
    (p.ini === p.fim ? rotuloData(p.ini) : `${dataCompleta(p.ini)} a ${dataCompleta(p.fim)}`) +
    (p.turno ? ` · ${ROTULO_TURNO[p.turno]}` : "");
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold first-letter:uppercase">{periodo}</p>
        <p className="text-sm text-cafe tabular-nums">Recebeu {reais(p.recebeu)}</p>
      </div>
      <a
        href={`/minha-caixinha/comprovante?id=${p.id}`}
        target="_blank"
        rel="noopener"
        className="p-btn p-btn-secundario p-btn-sm"
      >
        Comprovante (PDF)
      </a>
    </li>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cafe">{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}
