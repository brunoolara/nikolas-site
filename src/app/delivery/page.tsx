import type { Metadata } from "next";
import { restaurante } from "@/data/restaurante";
import { TabelaHorarios } from "@/components/HorariosLocal";
import StatusAberto from "@/components/StatusAberto";
import { IconeWhatsApp } from "@/components/Header";

export const metadata: Metadata = {
  title: "Delivery em Ouro Fino",
  description:
    "Peça o Nikola's em casa: cardápio digital ou WhatsApp (35) 9 9772-8359. Executivos, carnes, massas caseiras, petiscos e sobremesas com entrega ou retirada em Ouro Fino.",
  alternates: { canonical: "/delivery" },
};

export default function Delivery() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-16 grid gap-12 md:grid-cols-12">
      <div className="md:col-span-7">
        <h1 className="font-display text-5xl md:text-6xl leading-tight text-balance">
          Nikola&rsquo;s na sua casa
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg text-cafe leading-relaxed">
          Dois jeitos de pedir. Pelo cardápio digital você monta o pedido com os preços e
          acompanhamentos na tela; pelo WhatsApp a gente te atende direto.
        </p>

        <ol className="mt-10 space-y-6">
          <li className="flex gap-5">
            <span className="font-display text-4xl leading-none text-chope-escuro w-8 shrink-0">1</span>
            <div>
              <h2 className="text-xl font-semibold">Cardápio digital</h2>
              <p className="mt-1 text-cafe">Escolha os pratos, informe o endereço e acompanhe o pedido.</p>
              <a
                href={restaurante.delivery.url}
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center rounded-full bg-verde text-papel px-5 py-3 font-semibold hover:bg-verde-escuro"
              >
                Abrir cardápio digital
              </a>
            </div>
          </li>
          <li className="flex gap-5">
            <span className="font-display text-4xl leading-none text-chope-escuro w-8 shrink-0">2</span>
            <div>
              <h2 className="text-xl font-semibold">WhatsApp</h2>
              <p className="mt-1 text-cafe">Mande a mensagem já pronta e diga o que quer.</p>
              <a
                href={restaurante.whatsapp.pedido}
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-tinta px-5 py-3 font-semibold hover:bg-tinta hover:text-papel"
              >
                <IconeWhatsApp />
                {restaurante.telefoneExibicao}
              </a>
            </div>
          </li>
        </ol>
      </div>

      <aside className="md:col-span-5 rounded-[1.5rem] bg-creme p-6 md:p-8 self-start">
        <h2 className="font-display text-3xl leading-tight">Horários de pedido</h2>
        <StatusAberto className="mt-3" />
        <TabelaHorarios className="mt-4" />
        <p className="mt-5 text-sm text-cafe">
          Retirada no balcão: {restaurante.endereco.linha}.
        </p>
      </aside>
    </section>
  );
}
