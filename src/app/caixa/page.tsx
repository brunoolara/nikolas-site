// Os caixas fechados na Takeat, lidos do e-mail "Conferência de caixa"
// (api/caixa/fechamento). Em cima, o fechamento escolhido (?id=, que é o que
// a notificação abre) ou o mais recente; embaixo, os anteriores.
// O resumo segue o pedido do Bruno em 26/11/2026: abertura, dinheiro contado
// com a sobra ou falta, as formas de pagamento somadas por tipo, o total do
// caixa, as sangrias uma a uma, o fundo do próximo caixa e o dinheiro a entregar.

import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecalho from "@/components/painel/Cabecalho";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { ehGestor } from "@/lib/notificacoes/armazem";
import { ehIlegivel, lerMeses, type Registro } from "@/lib/caixa/armazem";
import { ehFundo, resumir, turnoDe, type Fechamento, type Movimento } from "@/lib/caixa/email";
import { reais } from "@/lib/caixinha/tipos";
import { curto } from "@/lib/caixinha/periodo";

const hora = (quando: string) => quando.slice(11, 16);
const dia = (quando: string) => curto(quando.slice(0, 10));

/** Este mês e o anterior, AAAA-MM. */
function meses(): string[] {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const [a, m] = hoje.split("-").map(Number);
  const anterior = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
  return [hoje.slice(0, 7), anterior];
}

function Diferenca({ valor }: { valor: number }) {
  if (Math.abs(valor) < 0.01) return <span className="p-selo p-selo-verde">Bateu</span>;
  return valor > 0 ? (
    <span className="p-selo p-selo-ambar">Sobra de {reais(valor)}</span>
  ) : (
    <span className="p-selo p-selo-vermelho">Falta de {reais(-valor)}</span>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: React.ReactNode; valor: number; forte?: boolean }) {
  return (
    <tr className={forte ? "font-semibold" : undefined}>
      <td>{rotulo}</td>
      <td className="num">{reais(valor)}</td>
    </tr>
  );
}

function Movimentos({ titulo, lista }: { titulo: string; lista: Movimento[] }) {
  const total = lista.reduce((s, m) => s + m.valor, 0);
  return (
    <section className="mt-5">
      <h3 className="p-rotulo">{titulo}</h3>
      {lista.length ? (
        <table className="p-tabela mt-1">
          <tbody>
            {lista.map((m, i) => (
              <tr key={i}>
                <td>
                  <span className="tabular-nums text-cafe">{hora(m.quando)}</span> · {m.descricao || "sem descrição"}
                  {ehFundo(m) ? <span className="p-selo p-selo-verde ml-2">próximo caixa</span> : null}
                </td>
                <td className="num">{reais(m.valor)}</td>
              </tr>
            ))}
          </tbody>
          {lista.length > 1 ? (
            <tfoot>
              <Linha rotulo="Total" valor={total} />
            </tfoot>
          ) : null}
        </table>
      ) : (
        <p className="mt-1 text-sm text-cafe">Nenhuma.</p>
      )}
    </section>
  );
}

function Detalhe({ f }: { f: Fechamento }) {
  const r = resumir(f);
  return (
    <article className="p-cartao mt-6 p-5 sm:p-6">
      <h2 className="font-display text-2xl">
        {turnoDe(f)} · {dia(f.fechado)}
      </h2>
      <p className="mt-1 text-sm text-cafe">
        {f.aberto.slice(0, 10) === f.fechado.slice(0, 10)
          ? `${hora(f.aberto)} às ${hora(f.fechado)}`
          : `${dia(f.aberto)} ${hora(f.aberto)} a ${dia(f.fechado)} ${hora(f.fechado)}`}
        {f.fechadoPor ? ` · fechado por ${f.fechadoPor}` : ""}
      </p>

      <table className="p-tabela mt-4">
        <tbody>
          <Linha rotulo="Abertura" valor={f.abertura} />
          <tr>
            <td>
              Dinheiro final (contado) <Diferenca valor={f.diferenca} />
            </td>
            <td className="num">{reais(f.fundoFinal)}</td>
          </tr>
          <Linha rotulo="Crédito" valor={r.credito} />
          <Linha rotulo="Débito" valor={r.debito} />
          <Linha rotulo="Pix" valor={r.pix} />
          <Linha rotulo="Voucher" valor={r.voucher} />
          <Linha rotulo="Pagamentos online" valor={r.online} />
          <Linha rotulo="A prazo" valor={r.prazo} />
          {r.outros ? <Linha rotulo="Outras formas" valor={r.outros} /> : null}
        </tbody>
        <tfoot>
          <Linha rotulo="Total de vendas" valor={f.total} />
        </tfoot>
      </table>

      <Movimentos titulo="Sangrias" lista={f.sangrias} />
      {f.reforcos.length ? <Movimentos titulo="Reforços" lista={f.reforcos} /> : null}

      <table className="p-tabela mt-5">
        <tbody>
          <Linha rotulo="Fundo para o próximo caixa" valor={r.fundoProximo} />
          <Linha rotulo="Dinheiro esperado em caixa" valor={r.esperado} />
          <Linha rotulo="Dinheiro contado pelo caixa" valor={f.fundoFinal} />
        </tbody>
        <tfoot>
          <Linha rotulo="Dinheiro a entregar ao gestor" valor={r.aEntregar} />
        </tfoot>
      </table>
      {!r.fundoProximo ? (
        <p className="mt-2 text-sm text-cafe">
          Nenhuma sangria com “fundo” ou “troco” na descrição: o troco do próximo caixa não foi lançado.
        </p>
      ) : null}

      <details className="mt-5 text-sm">
        <summary className="cursor-pointer text-cafe">Ver as formas de pagamento como vieram da Takeat</summary>
        <table className="p-tabela mt-2">
          <thead>
            <tr>
              <th>Forma</th>
              <th className="num">Sistema</th>
              <th className="num">Contado</th>
            </tr>
          </thead>
          <tbody>
            {f.metodos.map((m) => (
              <tr key={m.nome}>
                <td>{m.nome}</td>
                <td className="num">{reais(m.sistema)}</td>
                <td className="num">{reais(m.usuario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}

function Item({ r, atual }: { r: Registro; atual: boolean }) {
  if (ehIlegivel(r))
    return (
      <li className="p-aviso p-aviso-erro">
        Não consegui ler o e-mail “{r.assunto || r.id}” ({r.erro}). Confira o fechamento direto na Takeat.
      </li>
    );
  return (
    <li>
      <Link
        href={`/caixa?id=${encodeURIComponent(r.id)}`}
        aria-current={atual ? "true" : undefined}
        className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-[var(--p-raio-sm)] border border-linha bg-white px-3 py-2 hover:border-verde/50 aria-[current=true]:border-verde"
      >
        <span>
          <strong>{turnoDe(r)}</strong> · {dia(r.fechado)}{" "}
          <span className="text-sm tabular-nums text-cafe">
            {hora(r.aberto)}–{hora(r.fechado)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{reais(r.total)}</span>
          {Math.abs(r.diferenca) >= 0.01 ? <Diferenca valor={r.diferenca} /> : null}
        </span>
      </Link>
    </li>
  );
}

export default async function Caixa({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  if (!ehGestor(sessao)) return null;

  const busca = await searchParams;
  const registros = await lerMeses(meses());
  const legiveis = registros.filter((r): r is Fechamento => !ehIlegivel(r));
  const escolhido = (typeof busca.id === "string" && legiveis.find((f) => f.id === busca.id)) || legiveis[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Fechamento de caixa"
        descricao="Cada caixa fechado na Takeat, lido do e-mail de conferência que ela manda."
      />

      {escolhido ? (
        <Detalhe f={escolhido} />
      ) : (
        <p className="p-cartao mt-6 p-6 text-center text-sm text-cafe">
          Nenhum fechamento chegou ainda. Eles aparecem aqui alguns minutos depois de o caixa ser fechado na Takeat.
        </p>
      )}

      {registros.length > 1 ? (
        <section className="mt-8">
          <h2 className="p-cartao-titulo">Este mês e o anterior</h2>
          <ul className="mt-3 grid gap-2">
            {registros.map((r) => (
              <Item key={r.id} r={r} atual={r.id === escolhido?.id} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
