// O que está pendente para a pessoa, pelas áreas que ela abre: post do dia,
// contagem de estoque e caixinha sem fechar. Os alertas vêm primeiro e são os
// que contam no número do sino.

import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { avisosDe } from "@/lib/avisos";

export default async function Avisos() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  const avisos = await avisosDe(sessao);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho titulo="Avisos" descricao="O que está pendente nas áreas que você abre." />

      {avisos.length ? (
        <ul className="mt-6 space-y-3">
          {avisos.map((a) => (
            <li key={a.chave}>
              <Link
                href={a.href}
                className={`p-cartao flex items-start gap-3 p-4 transition-[border-color,box-shadow] duration-150 hover:border-verde/50 ${
                  a.tipo === "alerta" ? "border-l-4 border-l-[var(--p-vermelho)]" : ""
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    a.tipo === "alerta"
                      ? "bg-[var(--p-vermelho-fundo)] text-[var(--p-vermelho)]"
                      : "bg-[var(--p-verde-fundo)] text-verde"
                  }`}
                >
                  <Icone nome={a.tipo === "alerta" ? "alerta" : "sino"} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.titulo}</span>
                  <span className="mt-0.5 block text-sm text-cafe">{a.texto}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-verde">
                    {a.acao}
                    <Icone nome="seta" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-cartao mt-6 p-8 text-center">
          <p className="font-display text-xl">Tudo em dia</p>
          <p className="mt-1 text-sm text-cafe">Nenhuma pendência nas suas áreas agora.</p>
        </div>
      )}
    </div>
  );
}
