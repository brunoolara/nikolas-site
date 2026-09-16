import type { Metadata } from "next";
import { anosDeTradicao, restaurante } from "@/data/restaurante";
import Foto from "@/components/Foto";
import Depoimentos from "@/components/Depoimentos";

export const metadata: Metadata = {
  title: "Nossa história, desde 1977",
  description:
    "O Nikola's nasceu em 1977 com o Sr. Nicola Tahan, em Ouro Fino, MG. Comida mineira com raízes árabes, feijão tropeiro todo dia e o mesmo jeito de receber há décadas.",
  alternates: { canonical: "/sobre" },
};

export default function Sobre() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-16">
        <h1 className="font-display text-5xl md:text-6xl leading-tight text-balance max-w-[20ch]">
          Desde 1977 à mesa de Ouro Fino
        </h1>

        <div className="mt-10 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7 space-y-5 text-lg text-cafe leading-relaxed max-w-[60ch]">
            <p>
              Tudo começou com o Sr. Nicola Tahan preparando as receitas num espaço pequeno no centro
              da cidade. A proposta era a de sempre: comida bem feita, servida com fartura, num lugar
              onde a pessoa se sentisse em casa.
            </p>
            <p>
              Dessas origens vêm dois traços que seguem no cardápio até hoje. O tempero mineiro, com
              o feijão tropeiro servido todos os dias, o viradão, a dobradinha e o torresmo. E a
              herança árabe da família, no kibe, no homus e no babaganuche.
            </p>
            <p>
              Em {anosDeTradicao} anos o restaurante cresceu, mudou de tamanho e de cara mais de uma
              vez, e ganhou o delivery e o chope gelado como marcas registradas. O que não mudou foi
              o cuidado com cada prato e com quem senta à mesa.
            </p>
            <p>
              Hoje o Nikola&rsquo;s recebe famílias no almoço de domingo, quem trabalha no centro nos
              executivos de segunda a sexta, e viajantes que cruzam o sul de Minas e já sabem onde
              parar.
            </p>
          </div>

          <div className="md:col-span-5 grid grid-cols-2 gap-4 self-start">
            <Foto
              src="/images/historia-1.jpg"
              alt="Entrada do Nikola's, com a varanda e os bancos de madeira"
              className="aspect-[4/5] rounded-[1.25rem]"
              sizes="(min-width: 768px) 40vw, 100vw"
            />
            <Foto
              src="/images/historia-2.jpg"
              alt="Salão do Nikola's visto entre as plantas, com as cadeiras listradas"
              className="aspect-[4/5] rounded-[1.25rem]"
              sizes="(min-width: 768px) 40vw, 100vw"
            />
          </div>
        </div>

        <ol className="mt-16 grid gap-6 sm:grid-cols-3 border-t border-linha pt-8">
          <li>
            <p className="font-display text-4xl">1977</p>
            <p className="mt-1 text-cafe">Sr. Nicola Tahan abre o restaurante num pequeno espaço no centro.</p>
          </li>
          <li>
            <p className="font-display text-4xl">Expansões</p>
            <p className="mt-1 text-cafe">O salão cresce e o cardápio ganha massas caseiras, carnes na chapa e petiscos.</p>
          </li>
          <li>
            <p className="font-display text-4xl">Hoje</p>
            <p className="mt-1 text-cafe">
              Nota {restaurante.google.nota} no Google com mais de mil avaliações, delivery e a mesma
              cozinha de sempre.
            </p>
          </li>
        </ol>
      </section>

      <Depoimentos />
    </>
  );
}
