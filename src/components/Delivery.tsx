import { restaurante } from "@/data/restaurante";
import { IconeWhatsApp } from "./Header";

export default function Delivery({ titulo = "Está com vontade de Nikola's?" }: { titulo?: string }) {
  return (
    <section aria-labelledby="delivery" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24">
      <div className="rounded-[1.5rem] bg-tinta text-papel px-6 py-10 sm:px-10 md:px-14 md:py-14 grid gap-8 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <h2 id="delivery" className="font-display text-4xl md:text-5xl leading-tight text-balance">
            {titulo}
          </h2>
          <p className="mt-4 text-papel/75 text-lg leading-relaxed max-w-[48ch]">
            Peça pelo cardápio digital ou direto no WhatsApp e receba em casa, ou retire no balcão.
          </p>
        </div>
        <div className="md:col-span-5 flex flex-col gap-3">
          <a
            href={restaurante.delivery.url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center rounded-full bg-chope text-tinta px-6 py-3.5 font-semibold hover:bg-chope-escuro"
          >
            Pedir pelo cardápio digital
          </a>
          <a
            href={restaurante.whatsapp.pedido}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-papel/40 px-6 py-3.5 font-semibold hover:border-papel"
          >
            <IconeWhatsApp />
            Pedir pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
