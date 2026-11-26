// O comprovante de uma pessoa: de um pagamento feito (?id=&pessoa=) ou a
// prévia de dias ainda abertos (?ini=&fim=&pessoa=). Mostra o que ela vê no
// WhatsApp, com os botões para mandar em texto ou PDF.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import {
  buscarComprovante,
  colunasDe,
  consulta,
  fonteDe,
  nomeArquivo,
  quandoCurto,
  rodape,
  RODAPE,
  ROTULO_COLUNA,
  rotuloDia,
  rotuloDiaCurto,
  textoComprovante,
  totalDia,
} from "@/lib/caixinha/comprovante";
import { reais } from "@/lib/caixinha/tipos";
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
  const colunas = colunasDe(c);
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

      {/* a mesma ordem do PDF: o valor primeiro, depois de quem e de quando, os dias e a conta */}
      <section className="p-cartao mt-6 max-w-xl overflow-hidden">
        <div className="p-5">
          <p className="text-[13px] font-semibold text-cafe">
            {c.pago ? "Comprovante da caixinha" : "Prévia da caixinha · ainda não fechada"}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-verde">{reais(l.pagar)}</p>
          <p className="mt-1 text-base">
            {c.pago ? "Recebido por" : "A receber por"} <strong>{c.nome}</strong>
          </p>
          <p className="text-sm text-cafe">{quandoCurto(c)}</p>
        </div>

        {varios ? (
          <table className="p-tabela border-t border-linha">
            <thead>
              <tr>
                <th className="!pl-5">Dia</th>
                {colunas.map((k, i) => (
                  <th key={k} className={`num ${colunas.length === 1 && i === 0 ? "!pr-5" : ""}`}>
                    {ROTULO_COLUNA[k]}
                  </th>
                ))}
                {colunas.length > 1 ? <th className="num !pr-5">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {c.dias.map((d) => (
                <tr key={d.data}>
                  <td className="!pl-5">{colunas.length > 1 ? rotuloDiaCurto(d.data) : rotuloDia(d.data)}</td>
                  {colunas.map((k, i) => (
                    <td key={k} className={`num ${colunas.length === 1 && i === 0 ? "!pr-5" : ""}`}>
                      {d[k] ? (k === "consumo" ? `− ${reais(d[k])}` : reais(d[k])) : "–"}
                    </td>
                  ))}
                  {colunas.length > 1 ? <td className="num !pr-5">{reais(totalDia(d))}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <dl className="space-y-1.5 border-t border-linha px-5 pt-4 text-sm">
          {l.almoco ? <Item rotulo={varios ? "Almoço no período" : "Almoço"} valor={reais(l.almoco)} /> : null}
          {l.jantar ? <Item rotulo={varios ? "Jantar no período" : "Jantar"} valor={reais(l.jantar)} /> : null}
          {l.consumo ? <Item rotulo="Consumo descontado" valor={`− ${reais(l.consumo)}`} /> : null}
          {l.saldoAnterior ? <Item rotulo="Saldo anterior" valor={`− ${reais(-l.saldoAnterior)}`} /> : null}
        </dl>
        <div className="mx-5 mt-3 flex items-baseline justify-between border-t border-tinta pt-2.5">
          <span className="font-semibold">{c.pago ? "Recebe" : "A receber"}</span>
          <span className="font-semibold tabular-nums">{reais(l.pagar)}</span>
        </div>

        <div className="px-5 pb-5">
          {l.novoSaldo < 0 ? (
            <p className="mt-3 text-sm text-cafe">Fica para descontar no próximo pagamento: {reais(-l.novoSaldo)}</p>
          ) : null}
          <p className="mt-4 text-xs text-cafe">{RODAPE}</p>
          <p className="mt-1 text-xs text-cafe">{rodape(c)} (só aqui na tela, não vai para a pessoa)</p>
          <Enviar texto={textoComprovante(c)} pdf={pdf} arquivo={nomeArquivo(c)} />
        </div>
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
