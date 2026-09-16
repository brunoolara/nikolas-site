import Link from "next/link";

const pratos = [
  { nome: "Feijão tropeiro", nota: "servido todos os dias" },
  { nome: "Salada de berinjela", nota: "receita da casa" },
  { nome: "Dobradinha à moda Nikola's", nota: "feijão branco, calabresa e bacon" },
  { nome: "Viradão à mineira", nota: "bisteca, lombo, tutu, torresmo e couve" },
  { nome: "Filé à parmegiana", nota: "o mais citado nas avaliações" },
  { nome: "Chope", nota: "gelado e cremoso" },
];

// O quadro de destaques é a peça central da página: um cardápio de parede,
// com linha pontilhada entre o prato e a observação, como nos restaurantes antigos.
export default function Destaques() {
  return (
    <section aria-labelledby="destaques" className="bg-verde text-papel">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <h2 id="destaques" className="font-display text-4xl md:text-5xl leading-tight">
            Os pratos da casa
          </h2>
          <p className="mt-4 text-papel/75 max-w-[38ch] leading-relaxed">
            Os que estão no cardápio há décadas e os que a cidade mais pede. Executivos de segunda a
            sexta a partir de R$ 28, com arroz, tropeiro, salada e fritas.
          </p>
          <Link
            href="/cardapio"
            className="mt-8 inline-flex items-center rounded-full bg-chope text-tinta px-5 py-3 font-semibold hover:bg-chope-escuro"
          >
            Cardápio completo
          </Link>
        </div>

        <ul className="md:col-span-8 md:pl-8 divide-y divide-papel/15">
          {pratos.map((p) => (
            <li key={p.nome} className="flex flex-col sm:flex-row sm:items-baseline py-4 md:py-5">
              <span className="font-display text-2xl md:text-[2rem] leading-tight">{p.nome}</span>
              <span className="leader hidden sm:block" aria-hidden="true" />
              <span className="mt-1 sm:mt-0 sm:shrink-0 sm:text-right text-sm md:text-base text-papel/75 sm:max-w-[45%]">
                {p.nota}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
