// Um botão por pessoa para abrir o comprovante dela: de um pagamento feito
// ou, com os dias ainda abertos, a prévia.

import Link from "next/link";
import { consulta, type Fonte } from "@/lib/caixinha/comprovante";
import { reais, type LinhaPagamento } from "@/lib/caixinha/tipos";

export default function Comprovantes({ fonte, linhas }: { fonte: Fonte; linhas: LinhaPagamento[] }) {
  const previa = !("id" in fonte);
  if (!linhas.length) return null;
  return (
    <section className="p-cartao mt-6 p-5">
      <h3 className="p-cartao-titulo">{previa ? "Prévia dos comprovantes" : "Comprovantes"}</h3>
      <p className="mt-1 text-sm text-cafe">
        Abra o de cada pessoa para mandar no WhatsApp, em texto ou PDF.
        {previa ? " Ainda não fechado: os valores podem mudar até o fechamento." : ""}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {linhas.map((l) => (
          <li key={l.pessoa}>
            <Link
              href={`/caixinha/comprovante?${consulta(fonte, l.pessoa)}`}
              className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--p-raio-sm)] border border-linha px-3 hover:border-verde/50"
            >
              <span className="font-semibold">{l.nome}</span>
              <span className="text-sm tabular-nums text-cafe">{reais(l.pagar)} ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
