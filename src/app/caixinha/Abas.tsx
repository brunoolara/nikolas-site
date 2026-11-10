// As abas da Caixinha: o dia, o pagamento de vários dias, o relatório (só
// dos donos) e a equipe.

import Link from "next/link";
import Icone, { type NomeIcone } from "@/components/painel/Icone";

type Aba = "dia" | "pagamento" | "relatorio" | "equipe";

const ABAS: { chave: Aba; href: string; nome: string; icone: NomeIcone; master?: boolean }[] = [
  { chave: "dia", href: "/caixinha", nome: "Dia", icone: "caixinha" },
  { chave: "pagamento", href: "/caixinha/pagamento", nome: "Pagar período", icone: "calendario" },
  { chave: "relatorio", href: "/caixinha/relatorio", nome: "Relatório", icone: "cmv", master: true },
  { chave: "equipe", href: "/caixinha/equipe", nome: "Equipe", icone: "equipe" },
];

export default function Abas({ atual, master }: { atual: Aba; master: boolean }) {
  return (
    <nav
      className="p-rolagem mt-6 flex gap-1 rounded-[var(--p-raio)] border border-linha bg-white p-1 shadow-[var(--p-sombra)]"
      aria-label="Partes da Caixinha"
    >
      {ABAS.filter((a) => !a.master || master).map((a) => (
        <Link
          key={a.chave}
          href={a.href}
          aria-current={a.chave === atual ? "page" : undefined}
          className={`p-btn p-btn-sm flex-1 shrink-0 whitespace-nowrap px-2 sm:px-3 ${a.chave === atual ? "p-btn-primario" : "p-btn-fantasma"}`}
        >
          <Icone nome={a.icone} className="hidden h-4 w-4 sm:block" />
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
