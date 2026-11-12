// Um botão por pessoa para abrir o comprovante dela no pagamento.

import Link from "next/link";
import { reais, type LinhaPagamento } from "@/lib/caixinha/tipos";

export default function Comprovantes({ id, linhas }: { id: string; linhas: LinhaPagamento[] }) {
  if (!linhas.length) return null;
  return (
    <section className="p-cartao mt-6 p-5">
      <h3 className="p-cartao-titulo">Comprovantes</h3>
      <p className="mt-1 text-sm text-cafe">Abra o de cada pessoa para mandar no WhatsApp, em texto ou PDF.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {linhas.map((l) => (
          <li key={l.pessoa}>
            <Link
              href={`/caixinha/comprovante?id=${id}&pessoa=${encodeURIComponent(l.pessoa)}`}
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
