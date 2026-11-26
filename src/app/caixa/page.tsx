// Os caixas fechados na Takeat, lidos do e-mail "Conferência de caixa"
// (api/caixa/fechamento). Em cima, o fechamento escolhido (?id=, que é o que
// a notificação abre) ou o mais recente; embaixo, os dos últimos 7 dias, ou os
// de uma data e turno buscados (?data=AAAA-MM-DD&turno=almoco|jantar).
// O resumo segue o pedido do Bruno em 26/11/2026: abertura, dinheiro contado
// com a sobra ou falta, as formas de pagamento somadas por tipo, o total do
// caixa, as sangrias uma a uma, o fundo do próximo caixa, o dinheiro a entregar
// e a Caixinha do mesmo turno (lib/caixa/caixinha.ts).

import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecalho from "@/components/painel/Cabecalho";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { ehGestor } from "@/lib/notificacoes/armazem";
import { ehIlegivel, lerMeses, type Registro } from "@/lib/caixa/armazem";
import { ehFundo, resumir, turnoDe, type Fechamento, type Movimento } from "@/lib/caixa/email";
import { reais } from "@/lib/caixinha/tipos";
import { caixinhaDoTurno, type CaixinhaDoTurno } from "@/lib/caixa/caixinha";
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

function Detalhe({ f, caixinha }: { f: Fechamento; caixinha: CaixinhaDoTurno }) {
  const r = resumir(f);
  return (
    <article className="p-cartao mt-6 p-5 sm:p-6">
      <h2 className="font-display text-2xl">
        {turnoDe(f)} · {dia(f.aberto)}
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

      <section className="mt-5">
        <h3 className="p-rotulo">Caixinha</h3>
        <table className="p-tabela mt-1">
          <tbody>
            <tr>
              <td>
                Caixinha do {turnoDe(f).toLowerCase()} para os funcionários{" "}
                {caixinha.situacao === "paga" ? (
                  <span className="p-selo p-selo-verde">Paga</span>
                ) : caixinha.situacao === "a-pagar" ? (
                  <span className="p-selo p-selo-ambar">A pagar</span>
                ) : null}
              </td>
              <td className="num">
                {"valor" in caixinha ? (
                  reais(caixinha.valor)
                ) : (
                  <span className="text-cafe">
                    {caixinha.situacao === "aberta"
                      ? "ainda não fechada"
                      : caixinha.situacao === "sem-taxa"
                        ? "sem a taxa"
                        : "não lançada"}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

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

function Item({ r, atual, filtro }: { r: Registro; atual: boolean; filtro: string }) {
  if (ehIlegivel(r))
    return (
      <li className="p-aviso p-aviso-erro">
        Não consegui ler o e-mail “{r.assunto || r.id}” ({r.erro}). Confira o fechamento direto na Takeat.
      </li>
    );
  return (
    <li>
      <Link
        href={`/caixa?id=${encodeURIComponent(r.id)}${filtro ? `&${filtro}` : ""}`}
        aria-current={atual ? "true" : undefined}
        className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-[var(--p-raio-sm)] border border-linha bg-white px-3 py-2 hover:border-verde/50 aria-[current=true]:border-verde"
      >
        <span>
          <strong>{turnoDe(r)}</strong> · {dia(r.aberto)}{" "}
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

const DATA = /^d{4}-d{2}-d{2}$/;
const TURNOS = { almoco: "Almoço", jantar: "Jantar" } as const;
type ChaveTurno = keyof typeof TURNOS;
const ehTurno = (t: unknown): t is ChaveTurno => t === "almoco" || t === "jantar";
const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
// o turno pertence ao dia em que abriu (jantar que fecha depois da meia-noite)
const diaDe = (r: Registro) => (ehIlegivel(r) ? r.recebido : r.aberto).slice(0, 10);

export default async function Caixa({
  searchParams,
}: {
  searchParams: Promise<Record<"id" | "data" | "turno", string | string[] | undefined>>;
}) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  if (!ehGestor(sessao)) return null;

  const busca = await searchParams;
  const data = DATA.test(texto(busca.data)) ? texto(busca.data) : "";
  const turno = ehTurno(busca.turno) ? busca.turno : "";
  const filtrando = Boolean(data || turno);

  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const seteDias = new Date(Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10) - 6))
    .toISOString()
    .slice(0, 10);
  const registros = await lerMeses(data ? [data.slice(0, 7)] : meses());
  const lista = registros.filter((r) =>
    filtrando
      ? (!data || diaDe(r) === data) && (!turno || (!ehIlegivel(r) && turnoDe(r) === TURNOS[turno]))
      : diaDe(r) >= seteDias,
  );
  const legiveis = registros.filter((r): r is Fechamento => !ehIlegivel(r));
  const escolhido =
    legiveis.find((f) => f.id === texto(busca.id)) ??
    lista.find((r): r is Fechamento => !ehIlegivel(r)) ??
    (filtrando ? undefined : legiveis[0]);
  const caixinha = escolhido
    ? await caixinhaDoTurno(escolhido.aberto.slice(0, 10), turnoDe(escolhido) === "Almoço" ? "almoco" : "jantar")
    : null;
  const filtro = [data && `data=${data}`, turno && `turno=${turno}`].filter(Boolean).join("&");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho titulo="Fechamento de caixa" />

      {escolhido && caixinha ? (
        <Detalhe f={escolhido} caixinha={caixinha} />
      ) : (
        <p className="p-cartao mt-6 p-6 text-center text-sm text-cafe">
          {filtrando
            ? "Nenhum fechamento nessa data e turno."
            : "Nenhum fechamento chegou ainda. Eles aparecem aqui alguns minutos depois de o caixa ser fechado na Takeat."}
        </p>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="p-cartao-titulo">{filtrando ? "Busca" : "Últimos 7 dias"}</h2>
          {filtrando ? (
            <Link href="/caixa" className="text-sm font-semibold text-verde hover:underline">
              Ver os últimos 7 dias
            </Link>
          ) : null}
        </div>
        {/* data e turno lado a lado, mesma altura; no celular o Buscar ocupa a linha de baixo */}
        <form
          action="/caixa"
          className="p-cartao mt-3 grid grid-cols-2 items-start gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-4"
        >
          <label className="block min-w-0">
            <span className="p-rotulo">Data</span>
            {/* sem busca, a data já vem com hoje: o Safari não mostra nada num campo de data vazio */}
            <input type="date" name="data" defaultValue={data || hoje} max={hoje} className="p-campo mt-1 h-11" />
          </label>
          <label className="block min-w-0">
            <span className="p-rotulo">Turno</span>
            <select name="turno" defaultValue={turno} className="p-campo mt-1 block h-11">
              <option value="">Os dois</option>
              <option value="almoco">Almoço</option>
              <option value="jantar">Jantar</option>
            </select>
          </label>
          <button type="submit" className="p-btn p-btn-primario col-span-2 h-11 px-6 sm:col-span-1">
            Buscar
          </button>
        </form>
        {lista.length ? (
          <ul className="mt-4 grid gap-2">
            {lista.map((r) => (
              <Item key={r.id} r={r} atual={r.id === escolhido?.id} filtro={filtro} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-cafe">Nenhum fechamento {filtrando ? "encontrado" : "nos últimos 7 dias"}.</p>
        )}
      </section>
    </div>
  );
}
