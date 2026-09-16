import type { Metadata } from "next";
import { cardapio, formatarPreco } from "@/data/cardapio";
import { restaurante } from "@/data/restaurante";
import Delivery from "@/components/Delivery";

export const metadata: Metadata = {
  title: "Cardápio",
  description:
    "Cardápio do Nikola's em Ouro Fino: executivos de segunda a sexta, viradão à mineira, dobradinha, carnes na chapa, massas caseiras, especialidades árabes, petiscos, sobremesas e chope.",
  alternates: { canonical: "/cardapio" },
};

export default function Cardapio() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 md:pt-16">
        <h1 className="font-display text-5xl md:text-6xl leading-tight">Cardápio</h1>
        <p className="mt-4 max-w-[56ch] text-lg text-cafe leading-relaxed">
          Almoço e jantar à la carte, com pratos executivos de segunda a sexta. Os valores são os
          do cardápio digital e podem mudar sem aviso; pratos sem preço variam conforme o
          acompanhamento escolhido.
        </p>
      </section>

      <nav
        aria-label="Categorias do cardápio"
        className="sticky top-16 z-30 bg-papel/95 backdrop-blur border-y border-linha mt-8"
      >
        <ul className="mx-auto max-w-6xl px-4 sm:px-6 flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
          {cardapio.map((c) => (
            <li key={c.id} className="shrink-0">
              <a
                href={`#${c.id}`}
                className="inline-block rounded-full border border-linha bg-papel px-4 py-1.5 text-sm font-medium hover:border-tinta"
              >
                {c.titulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16 md:columns-2 md:gap-16 space-y-12">
        {cardapio.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`t-${c.id}`} className="scroll-mt-32 break-inside-avoid">
            <h2 id={`t-${c.id}`} className="font-display text-3xl md:text-4xl leading-tight">
              {c.titulo}
            </h2>
            {c.nota && <p className="mt-1 text-cafe">{c.nota}</p>}
            <ul className="mt-5 divide-y divide-linha">
              {c.itens.map((item) => (
                <li key={item.nome} className="py-3">
                  <div className="flex items-baseline">
                    <span className="font-medium text-[17px] leading-snug">{item.nome}</span>
                    {item.preco !== null && (
                      <>
                        <span className="leader" aria-hidden="true" />
                        <span className="shrink-0 tabular-nums">{formatarPreco(item.preco)}</span>
                      </>
                    )}
                  </div>
                  {item.desc && <p className="mt-0.5 text-[15px] text-cafe max-w-[48ch]">{item.desc}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mx-auto max-w-6xl px-4 sm:px-6 text-cafe">
        Preços atualizados em setembro de 2026 a partir do{" "}
        <a href={restaurante.delivery.url} target="_blank" rel="noopener" className="underline underline-offset-4 decoration-linha hover:text-tinta">
          cardápio digital
        </a>
        .
      </p>

      <Delivery titulo="Quer pedir em casa?" />
    </>
  );
}
