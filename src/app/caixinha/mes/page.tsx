// Resumo do mês: só os dias fechados. Quanto cada pessoa recebeu, consumiu e
// quanto de taxa entrou, dia a dia. O mês fica no endereço (?mes=AAAA-MM).

import Link from "next/link";
import { exigir } from "@/lib/acessos/sessao";
import Cabecalho from "@/components/painel/Cabecalho";
import { hoje, rotuloData } from "@/lib/posts/tipos";
import { lerDia, lerEstado } from "@/lib/caixinha/armazem";
import { reais } from "@/lib/caixinha/tipos";

const MES = /^\d{4}-\d{2}$/;

function mesVizinho(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export default async function Mes({ searchParams }: PageProps<"/caixinha/mes">) {
  if (!(await exigir("caixinha")).liberado) return null;
  const busca = await searchParams;
  const atual = hoje().slice(0, 7);
  const mes = typeof busca.mes === "string" && MES.test(busca.mes) ? busca.mes : atual;
  const [ano, numMes] = mes.split("-").map(Number);
  const qtd = new Date(Date.UTC(ano, numMes, 0)).getUTCDate();
  const datas = Array.from({ length: qtd }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);

  const [dias, estado] = await Promise.all([Promise.all(datas.map(lerDia)), lerEstado()]);
  const fechados = dias.filter((d) => d.fechamento);

  const porPessoa = new Map<string, { nome: string; recebeu: number; consumo: number; dias: number }>();
  for (const d of fechados)
    for (const l of d.fechamento!.linhas) {
      const p = porPessoa.get(l.pessoa) ?? { nome: l.nome, recebeu: 0, consumo: 0, dias: 0 };
      p.recebeu += l.pagar;
      p.consumo += l.consumo;
      p.dias += 1;
      porPessoa.set(l.pessoa, p);
    }
  const pessoas = [...porPessoa.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt-BR"));
  const taxaTotal = fechados.reduce((s, d) => s + d.fechamento!.taxa.almoco + d.fechamento!.taxa.jantar, 0);
  const pagoTotal = pessoas.reduce((s, [, p]) => s + p.recebeu, 0);
  const rotuloMes = new Date(Date.UTC(ano, numMes - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <Cabecalho
        voltar={{ href: "/caixinha", rotulo: "Caixinha" }}
        titulo="Caixinha do mês"
        descricao="Quanto cada pessoa recebeu e consumiu. Só entram os dias fechados."
      />

      <nav className="p-cartao mt-6 flex items-center justify-between gap-2 p-3" aria-label="Escolher o mês">
        <Link href={`/caixinha/mes?mes=${mesVizinho(mes, -1)}`} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Mês anterior">
          ‹
        </Link>
        <h2 className="font-display text-2xl first-letter:uppercase">{rotuloMes}</h2>
        <Link href={`/caixinha/mes?mes=${mesVizinho(mes, 1)}`} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Próximo mês">
          ›
        </Link>
      </nav>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="p-cartao p-4">
          <p className="text-cafe">Dias fechados</p>
          <p className="font-display text-2xl">{fechados.length}</p>
        </div>
        <div className="p-cartao p-4">
          <p className="text-cafe">Taxa de serviço</p>
          <p className="font-display text-2xl tabular-nums">{reais(taxaTotal)}</p>
        </div>
        <div className="p-cartao p-4">
          <p className="text-cafe">Pago à equipe</p>
          <p className="font-display text-2xl tabular-nums">{reais(pagoTotal)}</p>
        </div>
      </div>

      <section className="p-cartao mt-6 p-5">
        <h3 className="p-cartao-titulo">Por pessoa</h3>
        {pessoas.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="p-tabela">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th className="num">Dias</th>
                  <th className="num">Consumo</th>
                  <th className="num">Recebeu</th>
                </tr>
              </thead>
              <tbody>
                {pessoas.map(([id, p]) => (
                  <tr key={id}>
                    <td className="font-medium">
                      {p.nome}
                      {estado.saldos[id] ? (
                        <span className="block text-xs text-red-700">deve {reais(-estado.saldos[id])} hoje</span>
                      ) : null}
                    </td>
                    <td className="num">{p.dias}</td>
                    <td className="num">{p.consumo ? reais(p.consumo) : "—"}</td>
                    <td className="num font-semibold">{reais(p.recebeu)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-cafe">Nenhum dia fechado neste mês.</p>
        )}
      </section>

      {fechados.length ? (
        <section className="p-cartao mt-6 p-5">
          <h3 className="p-cartao-titulo">Dia a dia</h3>
          <ul className="mt-3 divide-y divide-linha/70 text-sm">
            {fechados.map((d) => {
              const f = d.fechamento!;
              const pago = f.linhas.reduce((s, l) => s + l.pagar, 0);
              return (
                <li key={d.data} className="flex items-center justify-between gap-2 py-2">
                  <Link href={d.data === hoje() ? "/caixinha" : `/caixinha?dia=${d.data}`} className="text-verde underline first-letter:uppercase">
                    {rotuloData(d.data)}
                  </Link>
                  <span className="text-cafe tabular-nums">
                    taxa {reais(f.taxa.almoco + f.taxa.jantar)} · pago {reais(pago)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
