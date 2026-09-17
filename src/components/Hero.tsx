import Link from "next/link";
import { restaurante } from "@/data/restaurante";
import Foto from "./Foto";
import StatusAberto from "./StatusAberto";
import { IconeWhatsApp } from "./Header";

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-14 md:pt-16 md:pb-20 grid gap-10 md:grid-cols-12 md:items-center">
      <div className="md:col-span-7">
        <h1 className="font-display text-[2.75rem] leading-[1.02] sm:text-6xl md:text-[4.25rem] text-balance">
          Comida mineira de todo dia, em Ouro Fino desde 1977.
        </h1>
        <p className="mt-6 max-w-[52ch] text-lg text-cafe leading-relaxed">
          Feijão tropeiro servido diariamente, viradão à mineira, carnes na chapa,
          massas caseiras e o chope sempre gelado. No centro da cidade, com estacionamento fácil.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={restaurante.whatsapp.reserva}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full bg-verde text-papel px-6 py-3.5 text-base font-semibold hover:bg-verde-escuro"
          >
            <IconeWhatsApp />
            Reservar pelo WhatsApp
          </a>
          <Link
            href="/cardapio"
            className="inline-flex items-center rounded-full border-2 border-tinta px-6 py-3.5 text-base font-semibold hover:bg-tinta hover:text-papel"
          >
            Ver cardápio
          </Link>
        </div>
        <StatusAberto className="mt-6 text-cafe" />
      </div>

      <div className="md:col-span-5">
        <Foto
          src="/images/hero.jpg"
          alt="Picanha fatiada com farofa e batata frita, servida no Nikola's"
          className="aspect-[4/5] rounded-[1.5rem]"
          sizes="(min-width: 768px) 40vw, 100vw"
          priority
        />
      </div>
    </section>
  );
}
