import Link from "next/link";
import { restaurante } from "@/data/restaurante";
import { IconeWhatsApp } from "./Header";

// Barra fixa no rodapé do celular: as duas ações que mais importam ficam sempre à mão.
export default function BarraMobile() {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 p-2 bg-papel/95 backdrop-blur border-t border-linha pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <Link
        href="/cardapio"
        className="inline-flex items-center justify-center rounded-full border-2 border-tinta py-3 font-semibold"
      >
        Cardápio
      </Link>
      <a
        href={restaurante.whatsapp.reserva}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-verde text-papel py-3 font-semibold"
      >
        <IconeWhatsApp className="h-5 w-5" />
        WhatsApp
      </a>
    </div>
  );
}
