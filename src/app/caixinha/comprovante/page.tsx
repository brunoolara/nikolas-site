// O comprovante de uma pessoa num pagamento (?id=&pessoa=): o que ela vê no
// WhatsApp, com os botões para mandar em texto ou PDF.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { rotuloData } from "@/lib/posts/tipos";
import { lerComprovante, nomeArquivo, periodo, textoComprovante, totalDia } from "@/lib/caixinha/comprovante";
import { PAGAMENTO_ID, reais } from "@/lib/caixinha/tipos";
import Enviar from "./Enviar";

export default async function PaginaComprovante({ searchParams }: PageProps<"/caixinha/comprovante">) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const { liberado } = await exigir("caixinha");
  if (!liberado) return null;
  const busca = await searchParams;
  const id = typeof busca.id === "string" && PAGAMENTO_ID.test(busca.id) ? busca.id : null;
  const pessoa = typeof busca.pessoa === "string" ? busca.pessoa : "";
  const c = id && pessoa ? await lerComprovante(id, pessoa) : null;

  if (!c)
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Cabecalho titulo="Comprovante" />
        <p className="p-aviso p-aviso-info mt-4">
          Comprovante não encontrado (o pagamento pode ter sido reaberto).{" "}
          <Link href="/caixinha/pagamento" className="font-semibold underline">
            Ver os pagamentos
          </Link>
        </p>
      </div>
    );

  const l = c.linha;
  const varios = c.ini !== c.fim && c.dias.length > 0;
  const pdf = `/caixinha/comprovante/pdf?id=${c.idPagamento}&pessoa=${encodeURIComponent(pessoa)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link href={`/caixinha/pagamento?id=${c.idPagamento}`} className="text-sm font-semibold text-verde hover:underline">
        ‹ Voltar ao pagamento
      </Link>
      <Cabecalho titulo="Comprovante" descricao="Mande para a pessoa pelo WhatsApp, em texto ou em PDF." />

      <section className="p-cartao mt-6 max-w-xl p-5">
        <p className="font-display text-2xl">{c.nome}</p>
        <p className="text-sm text-cafe first-letter:uppercase">
          {c.ini === c.fim ? "Dia" : "Período"}: {periodo(c)}
        </p>

        {varios ? (
          <ul className="mt-4 divide-y divide-linha/70 border-y border-linha/70 text-sm">
            {c.dias.map((d) => (
              <li key={d.data} className="flex items-baseline justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-semibold first-letter:uppercase">{rotuloData(d.data)}</p>
                  <p className="text-xs text-cafe">
                    {[
                      d.almoco ? `Almoço ${reais(d.almoco)}` : "",
                      d.jantar ? `Jantar ${reais(d.jantar)}` : "",
                      d.consumo ? `Consumo − ${reais(d.consumo)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{reais(totalDia(d))}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-4 space-y-1.5 text-sm">
          {l.almoco ? <Item rotulo={varios ? "Almoço no período" : "Almoço"} valor={reais(l.almoco)} /> : null}
          {l.jantar ? <Item rotulo={varios ? "Jantar no período" : "Jantar"} valor={reais(l.jantar)} /> : null}
          {l.consumo ? <Item rotulo="Consumo descontado" valor={`− ${reais(l.consumo)}`} /> : null}
          {l.saldoAnterior ? <Item rotulo="Saldo anterior" valor={`− ${reais(-l.saldoAnterior)}`} /> : null}
        </dl>
        <div className="mt-3 flex items-baseline justify-between rounded-[var(--p-raio-sm)] bg-[var(--p-verde-fundo)] px-3 py-2.5 text-verde">
          <span className="font-semibold">Recebe</span>
          <span className="text-xl font-semibold tabular-nums">{reais(l.pagar)}</span>
        </div>
        {l.novoSaldo < 0 ? (
          <p className="mt-2 text-sm text-cafe">Fica para descontar no próximo pagamento: {reais(-l.novoSaldo)}</p>
        ) : null}

        <Enviar texto={textoComprovante(c)} pdf={pdf} arquivo={nomeArquivo(c)} />
      </section>
    </div>
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
