// Avisos: em cima, o que está pendente nas áreas da pessoa (post do dia,
// contagem de estoque, caixinha sem fechar); embaixo, as notificações que
// saíram para ela (fechamento do caixinha e do caixa, delivery novo e atrasado), da
// mais nova para a mais velha, agrupadas por dia. Tudo resumido, uma linha cada.
// Abrir esta tela conta como visto: o número do sino zera (lib/avisos.ts).

import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone, { type NomeIcone } from "@/components/painel/Icone";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { avisosDe } from "@/lib/avisos";
import { historicoDe, marcarVisto, type ItemHistorico } from "@/lib/notificacoes/historico";
import type { TipoAviso } from "@/lib/notificacoes/armazem";

const FUSO = "America/Sao_Paulo";
const ICONE: Record<TipoAviso, NomeIcone> = {
  caixinhaMinha: "caixinha",
  caixinhaTotal: "caixinha",
  caixaFechado: "caixa",
  deliveryAtrasado: "moto",
  deliveryNovo: "moto",
};

const diaLocal = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: FUSO });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

function rotuloDia(dia: string): string {
  const hoje = diaLocal(new Date().toISOString());
  const ontem = diaLocal(new Date(Date.now() - 86_400_000).toISOString());
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

function Linha({
  href,
  icone,
  titulo,
  texto,
  lado,
  alerta,
}: {
  href: string;
  icone: NomeIcone;
  titulo: string;
  texto: string;
  lado?: string;
  alerta?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-creme/60">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
            alerta ? "bg-[var(--p-vermelho-fundo)] text-[var(--p-vermelho)]" : "bg-creme text-verde"
          }`}
        >
          <Icone nome={icone} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-snug">{titulo}</span>
          <span className="block truncate text-[13px] leading-snug text-cafe">{texto}</span>
        </span>
        {lado ? <span className="shrink-0 text-xs tabular-nums text-cafe">{lado}</span> : null}
      </Link>
    </li>
  );
}

export default async function Avisos() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  const [pendencias, historico] = await Promise.all([avisosDe(sessao), historicoDe(sessao.usuario)]);
  // abriu Avisos: o sino zera até chegar algo novo
  after(() => marcarVisto(sessao.usuario, pendencias.map((a) => a.chave)).catch(() => {}));

  const porDia = new Map<string, ItemHistorico[]>();
  for (const i of historico) {
    const d = diaLocal(i.em);
    porDia.set(d, [...(porDia.get(d) ?? []), i]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho titulo="Avisos" />

      {pendencias.length ? (
        <section className="mt-6">
          <h2 className="p-rotulo">Pendências</h2>
          <ul className="p-cartao mt-2 divide-y divide-linha/70 overflow-hidden">
            {pendencias.map((a) => (
              <Linha
                key={a.chave}
                href={a.href}
                icone={a.tipo === "alerta" ? "alerta" : "sino"}
                titulo={a.titulo}
                texto={a.texto}
                alerta={a.tipo === "alerta"}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="p-rotulo">Notificações</h2>
        {historico.length ? (
          [...porDia].map(([dia, itens]) => (
            <div key={dia} className="mt-3">
              <h3 className="px-1 text-xs font-semibold text-cafe first-letter:uppercase">{rotuloDia(dia)}</h3>
              <ul className="p-cartao mt-1.5 divide-y divide-linha/70 overflow-hidden">
                {itens.map((i) => (
                  <Linha key={i.id} href={i.url} icone={ICONE[i.tipo]} titulo={i.titulo} texto={i.texto} lado={hora(i.em)} />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="p-cartao mt-2 p-6 text-center text-sm text-cafe">
            As notificações de caixinha, caixa e delivery ficam aqui, da mais nova para a mais antiga.
          </p>
        )}
      </section>
    </div>
  );
}
