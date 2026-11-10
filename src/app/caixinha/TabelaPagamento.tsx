// O quanto cada pessoa recebe: no celular uma linha por pessoa, no
// computador uma tabela. No modo "dia" mostra só o que a pessoa ganhou e
// consumiu naquele dia, sem saldo (o dia entrou num pagamento de vários dias).

import { reais, type LinhaPagamento, type ParteDia } from "@/lib/caixinha/tipos";

type Props =
  | { modo: "pagamento"; linhas: LinhaPagamento[]; pago?: boolean }
  | { modo: "dia"; partes: ParteDia[] };

export default function TabelaPagamento(props: Props) {
  const dia = props.modo === "dia";
  const linhas: LinhaPagamento[] = dia
    ? props.partes.map((p) => {
        const liquido = p.almoco + p.jantar - p.consumo;
        return { ...p, saldoAnterior: 0, liquido, pagar: liquido, novoSaldo: 0 };
      })
    : props.linhas;
  const total = linhas.reduce((s, l) => s + l.pagar, 0);
  const rotuloTotal = dia ? "Total do dia" : props.pago ? "Total pago" : "Total a pagar";

  return (
    <>
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
              {l.novoSaldo < 0 ? <p className="text-xs text-red-700">fica devendo {reais(-l.novoSaldo)}</p> : null}
            </div>
          </li>
        ))}
        <li className="flex justify-between py-3 font-semibold">
          <span>{rotuloTotal}</span>
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
              {dia ? null : <th className="num">Saldo anterior</th>}
              <th className="num">{dia ? "Do dia" : "Recebe"}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.pessoa}>
                <td className="font-medium">{l.nome}</td>
                <td className="num">{l.almoco ? reais(l.almoco) : "—"}</td>
                <td className="num">{l.jantar ? reais(l.jantar) : "—"}</td>
                <td className="num">{l.consumo ? `− ${reais(l.consumo)}` : "—"}</td>
                {dia ? null : <td className="num">{l.saldoAnterior ? reais(l.saldoAnterior) : "—"}</td>}
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
              <td colSpan={dia ? 4 : 5}>{rotuloTotal}</td>
              <td className="num text-base">{reais(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
