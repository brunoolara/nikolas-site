import { restaurante } from "@/data/restaurante";

// Avaliações públicas do Google, as mesmas que já estavam no site anterior.
const depoimentos = [
  {
    texto: "Comida deliciosa, bem servida, ótimo atendimento. Toda vez que venho a Ouro Fino passo por lá.",
    autor: "Tânia Regina",
  },
  {
    texto: "Lugar aconchegante, fácil localização, fácil estacionamento, bom atendimento, comida muito boa e preço compatível!",
    autor: "Neimar Gomes",
  },
  {
    texto: "Comida excelente, tempero mineiro de primeira. Várias opções de pratos executivos, torresmo sequinho e crocante.",
    autor: "Vagner Cunha",
  },
  {
    texto: "Sou de São Paulo e fiquei abismada com o tamanho do prato para 2 pessoas. Picanha deliciosa, 6 generosos pedaços, fritas, feijão tropeiro. Com certeza voltarei.",
    autor: "Marcia Ribeiro",
  },
];

export default function Depoimentos() {
  return (
    <section aria-labelledby="depoimentos" className="bg-creme">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="depoimentos" className="font-display text-4xl md:text-5xl leading-tight">
            O que dizem da gente
          </h2>
          <a
            href={restaurante.mapas.perfilGoogle}
            target="_blank"
            rel="noopener"
            className="text-cafe hover:text-tinta underline underline-offset-4 decoration-linha"
          >
            Nota {restaurante.google.nota} no Google, com {restaurante.google.avaliacoes} avaliações
          </a>
        </div>

        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {depoimentos.map((d) => (
            <li key={d.autor} className="border-l-2 border-chope pl-5">
              <blockquote className="font-display text-xl md:text-2xl leading-snug text-tinta/90">
                “{d.texto}”
              </blockquote>
              <p className="mt-3 text-cafe">{d.autor}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
