import { restaurante } from "@/data/restaurante";
import { formatarTurnos } from "@/lib/horarios";
import StatusAberto from "./StatusAberto";

export function TabelaHorarios({ className = "" }: { className?: string }) {
  return (
    <dl className={`divide-y divide-linha ${className}`}>
      {restaurante.horarios.map((h) => (
        <div key={h.rotulo} className="flex justify-between gap-6 py-3">
          <dt className="font-medium">{h.rotulo}</dt>
          <dd className="text-right text-cafe">{formatarTurnos(h.turnos)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HorariosLocal() {
  const { endereco, mapas } = restaurante;
  return (
    <section id="localizacao" aria-labelledby="onde" className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 md:pb-24 grid gap-10 md:grid-cols-12">
      <div className="md:col-span-5">
        <h2 id="onde" className="font-display text-4xl md:text-5xl leading-tight">
          Horários e como chegar
        </h2>
        <StatusAberto className="mt-4" />
        <TabelaHorarios className="mt-6" />

        <address className="not-italic mt-8 leading-relaxed">
          <strong className="font-semibold">{endereco.rua}, {endereco.complemento}</strong>
          <br />
          {endereco.bairro}, {endereco.cidade} - {endereco.uf}, {endereco.cep}
        </address>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={mapas.rota} target="_blank" rel="noopener" className="rounded-full border-2 border-tinta px-5 py-2.5 font-semibold hover:bg-tinta hover:text-papel">
            Rota no Google Maps
          </a>
          <a href={mapas.waze} target="_blank" rel="noopener" className="rounded-full border-2 border-tinta px-5 py-2.5 font-semibold hover:bg-tinta hover:text-papel">
            Abrir no Waze
          </a>
        </div>
      </div>

      <div className="md:col-span-7">
        <iframe
          title="Mapa: Nikola's Restaurante no centro de Ouro Fino"
          src={mapas.embed}
          className="w-full aspect-[4/3] md:aspect-auto md:h-full min-h-[320px] rounded-[1.5rem] border border-linha"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}
