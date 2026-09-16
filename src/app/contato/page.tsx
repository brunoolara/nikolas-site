import type { Metadata } from "next";
import { restaurante } from "@/data/restaurante";
import HorariosLocal from "@/components/HorariosLocal";
import { IconeWhatsApp } from "@/components/Header";

export const metadata: Metadata = {
  title: "Contato e reservas",
  description:
    "Fale com o Nikola's Restaurante em Ouro Fino: WhatsApp (35) 9 9772-8359, e-mail, endereço no centro, horários e como chegar pelo Google Maps ou Waze.",
  alternates: { canonical: "/contato" },
};

export default function Contato() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 md:pt-16 pb-12">
        <h1 className="font-display text-5xl md:text-6xl leading-tight">Contato e reservas</h1>
        <p className="mt-5 max-w-[52ch] text-lg text-cafe leading-relaxed">
          Para reservar mesa, combinar um almoço em grupo ou tirar dúvidas, o WhatsApp é o caminho
          mais rápido.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 max-w-3xl">
          <li>
            <a
              href={restaurante.whatsapp.reserva}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-4 rounded-[1.25rem] bg-verde text-papel p-5 hover:bg-verde-escuro"
            >
              <IconeWhatsApp className="h-8 w-8 shrink-0" />
              <span>
                <span className="block text-sm text-papel/75">WhatsApp e telefone</span>
                <span className="block text-xl font-semibold">{restaurante.telefoneExibicao}</span>
              </span>
            </a>
          </li>
          <li>
            <a
              href={`mailto:${restaurante.email}`}
              className="flex items-center gap-4 rounded-[1.25rem] border-2 border-linha p-5 hover:border-tinta"
            >
              <span>
                <span className="block text-sm text-cafe">E-mail</span>
                <span className="block text-lg font-semibold break-all">{restaurante.email}</span>
              </span>
            </a>
          </li>
          <li>
            <a
              href={restaurante.instagram.url}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-4 rounded-[1.25rem] border-2 border-linha p-5 hover:border-tinta"
            >
              <span>
                <span className="block text-sm text-cafe">Instagram</span>
                <span className="block text-lg font-semibold">{restaurante.instagram.handle}</span>
              </span>
            </a>
          </li>
        </ul>
      </section>

      <HorariosLocal />
    </>
  );
}
