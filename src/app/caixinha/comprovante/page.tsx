// O comprovante de uma pessoa: de um pagamento feito (?id=&pessoa=) ou a
// prévia de dias ainda abertos (?ini=&fim=&pessoa=). Mostra o que ela vê no
// WhatsApp, com os botões para mandar em texto ou PDF.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { rotuloData } from "@/lib/posts/tipos";
import {
  buscarComprovante,
  consulta,
  fonteDe,
  nomeArquivo,
  periodo,
  rodape,
  RODAPE,
  textoComprovante,
  totalDia,
} from "@/lib/caixinha/comprovante";
import { reais, ROTULO_TURNO } from "@/lib/caixinha/tipos";
import Enviar from "./Enviar";

export default async function PaginaComprovante({ searchParams }: PageProps<"/caixinha/comprovante">) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const { liberado } = await exigir("caixinha");
  if (!liberado) return null;
  const busca = await searchParams;
  const params = new URLSearchParams();
  for (const k of ["id", "ini", "fim", "turno", "pessoa"]) if (typeof busca[k] === "string") params.set(k, busca[k]);
  const fonte = fonteDe(params);
  const pessoa = params.get("pessoa") ?? "";
  const c = fonte && pessoa ? await buscarComprovante(fonte, pessoa) : null;

  if (!c)
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Cabecalho titulo="Comprovante" />
        <p className="p-aviso p-aviso-info mt-4">
          Comprovante não encontrado. O pagamento pode ter sido reaberto, ou o dia já foi fechado e o comprovante
          está no pagamento.{" "}
          <Link href="/caixinha/pagamento" className="font-semibold underline">
            Ver os pagamentos
          </Link>
        </p>
      </div>
    );

  const l = c.linha;
  const varios = c.ini !== c.fim && c.dias.length > 0;
  const pdf = `/caixinha/comprovante/pdf?${consulta(fonte!, pessoa)}`;
  const voltar = c.pago
    ? { href: `/caixinha/pagamento?id=${c.pago.id}`, nome: "Voltar ao pagamento" }
    : c.ini === c.fim
      ? { href: `/caixinha?dia=${c.ini}${c.turno ? `&ver=${c.turno}` : ""}`, nome: "Voltar ao dia" }
      : { href: `/caixinha/pagamento?ini=${c.ini}&fim=${c.fim}`, nome: "Voltar ao período" };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link href={voltar.href} className="text-sm font-semibold text-verde hover:underline">
        ‹ {voltar.nome}
      </Link>
      <Cabecalho
        titulo={c.pago ? "Comprovante" : "Prévia do comprovante"}
        descricao="Mande para a pessoa pelo WhatsApp, em texto ou em PDF."
      />
      {c.pago ? null : (
        <p className="p-aviso p-aviso-info mt-4 max-w-xl">
          Ainda não fechado: os valores podem mudar até o fechamento (taxa da Takeat, quem trabalhou, consumo).
        </p>
      )}

      <section className="p-cartao mt-6 max-w-xl p-5">
        <p className="text-lg">
          <span className="text-cafe">Funcionário:</span> <strong className="font-display text-2xl">{c.nome}</strong>
        </p>
        <p className="mt-1 text-base">
          {c.ini === c.fim ? "Dia" : "Período"}: {periodo({ ...c, turno: undefined })}
          {c.turno ? (
            <>
              <span className="text-cafe"> · </span>
              <strong>{ROTULO_TURNO[c.turno]}</strong>
            </>
          ) : null}
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
        <div className="mt-3 flex items-baseline justify-between border-t border-tinta pt-2.5">
          <span className="font-semibold">{c.pago ? "Recebe" : "A receber"}</span>
          <span className="text-lg font-semibold tabular-nums">{reais(l.pagar)}</span>
        </div>
        {l.novoSaldo < 0 ? (
          <p className="mt-2 text-sm text-cafe">Fica para descontar no próximo pagamento: {reais(-l.novoSaldo)}</p>
        ) : null}

        <p className="mt-3 text-xs text-cafe">{RODAPE}</p>
        <p className="mt-1 text-xs text-cafe">{rodape(c)} (só aqui na tela, não vai para a pessoa)</p>

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
