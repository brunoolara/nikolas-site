// Registro do painel, só para o master: o que mudou no cardápio e quem entrou.
// Filtros pelo endereço (?ver=, ?pessoa=), para funcionar sem JavaScript e o
// voltar do celular desfazer o filtro.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import { exigir } from "@/lib/acessos/sessao";
import { lerRegistro, type Evento } from "@/lib/registro";

const ABAS = [
  { chave: "cardapio", nome: "Edições do cardápio" },
  { chave: "acessos", nome: "Acessos" },
  { chave: "tudo", nome: "Tudo" },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

const FUSO = "America/Sao_Paulo";
const diaDe = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: FUSO });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, timeStyle: "short" });
const rotuloDia = (dia: string) => {
  const hoje = diaDe(new Date().toISOString());
  const ontem = diaDe(new Date(Date.now() - 864e5).toISOString());
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const DESCRICAO: Record<Evento["tipo"], string> = {
  entrou: "entrou no painel",
  saiu: "saiu do painel",
  visita: "usou o painel",
  falhou: "",
  cardapio: "salvou",
};

/** O servidor pode anotar a mesma visita mais de uma vez no dia: fica a primeira. */
function juntarVisitas(eventos: Evento[]): Evento[] {
  const vistos = new Set<string>();
  return [...eventos].reverse().filter((e) => {
    if (e.tipo !== "visita") return true;
    const chave = `${e.usuario}|${diaDe(e.quando)}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  }).reverse();
}

export default async function Registro({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; pessoa?: string }>;
}) {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("master")).liberado) return null;
  const busca = await searchParams;
  const aba: Aba = ABAS.some((a) => a.chave === busca.ver) ? (busca.ver as Aba) : "cardapio";
  const pessoa = busca.pessoa ?? "";

  const todos = juntarVisitas(await lerRegistro());
  const pessoas = [...new Map(todos.filter((e) => e.nome).map((e) => [e.usuario, e.nome!])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR"),
  );

  const eventos = todos.filter(
    (e) =>
      (aba === "tudo" || (aba === "cardapio" ? e.tipo === "cardapio" : e.tipo !== "cardapio")) &&
      (!pessoa || e.usuario === pessoa),
  );

  const porDia = new Map<string, Evento[]>();
  for (const e of eventos) porDia.set(diaDe(e.quando), [...(porDia.get(diaDe(e.quando)) ?? []), e]);

  const link = (troca: { ver?: string; pessoa?: string }) => {
    const quem = troca.pessoa ?? pessoa;
    const q = new URLSearchParams({ ver: troca.ver ?? aba, ...(quem ? { pessoa: quem } : {}) });
    return `/acessos/registro?${q}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Cabecalho
        voltar={{ href: "/acessos", rotulo: "Acessos" }}
        titulo="Registro"
        descricao="O que mudou no cardápio e quem entrou no painel, nos últimos três meses (horário de Brasília)."
      />

      <nav className="mt-6 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={link({ ver: a.chave })}
            className={`p-btn ${a.chave === aba ? "p-btn-primario" : "p-btn-secundario"}`}
          >
            {a.nome}
          </Link>
        ))}
      </nav>

      {pessoas.length ? (
        <nav className="mt-3 flex flex-wrap gap-1.5 text-sm">
          <Link
            href={link({ pessoa: "" })}
            className={`rounded-full border px-3 py-1 font-medium ${!pessoa ? "border-verde bg-verde/10 text-verde" : "border-linha bg-white text-cafe hover:border-verde"}`}
          >
            Todos
          </Link>
          {pessoas.map(([usuario, nome]) => (
            <Link
              key={usuario}
              href={link({ pessoa: usuario })}
              className={`rounded-full border px-3 py-1 font-medium ${
                pessoa === usuario ? "border-verde bg-verde/10 text-verde" : "border-linha bg-white text-cafe hover:border-verde"
              }`}
            >
              {nome}
            </Link>
          ))}
        </nav>
      ) : null}

      {porDia.size === 0 ? (
        <p className="mt-8 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">
          Nada registrado {aba === "cardapio" ? "no cardápio " : ""}neste período.
        </p>
      ) : null}

      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia} className="mt-8">
          <h2 className="font-display text-xl first-letter:uppercase">{rotuloDia(dia)}</h2>
          <ul className="p-cartao mt-3 divide-y divide-linha/70 overflow-hidden">
            {lista.map((e, i) => (
              <li key={i} className={`px-4 py-3 text-sm ${e.tipo === "falhou" ? "bg-[var(--p-vermelho-fundo)]" : ""}`}>
                <div className="flex gap-3">
                  <span className="w-12 shrink-0 tabular-nums text-cafe">{hora(e.quando)}</span>
                  <div className="min-w-0 flex-1">
                    <p>
                      {e.tipo === "falhou" ? "Tentativa de entrar recusada" : <><strong>{e.nome ?? e.usuario}</strong> {DESCRICAO[e.tipo]}</>}
                      {e.tipo === "cardapio" ? (
                        <>
                          {" "}
                          <strong>{e.onde}</strong>
                          <span className="text-cafe"> · versão {e.versao}</span>
                        </>
                      ) : null}
                      {e.tipo === "falhou" ? (
                        <span className="text-cafe">
                          {" "}
                          — usuário “{e.usuario}”: {e.onde}
                        </span>
                      ) : null}
                    </p>
                    {e.tipo === "cardapio" ? <Detalhes linhas={e.detalhes ?? []} /> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Detalhes({ linhas }: { linhas: string[] }) {
  if (!linhas.length) return <p className="mt-1 text-cafe">Salvou sem mudar nada.</p>;
  const [primeiras, resto] = [linhas.slice(0, 4), linhas.slice(4)];
  return (
    <div className="mt-1 text-cafe">
      <ul className="list-disc pl-5">
        {primeiras.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {resto.length ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-verde">Ver mais {resto.length}</summary>
          <ul className="list-disc pl-5">
            {resto.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
