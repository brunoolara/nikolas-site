import Link from "next/link";
import { anosDeTradicao } from "@/data/restaurante";
import Foto from "./Foto";

export default function Historia() {
  return (
    <section aria-labelledby="historia" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24 grid gap-10 md:grid-cols-12 md:items-center">
      <div className="md:col-span-5 md:order-2">
        <Foto
          src="/images/salao.jpg"
          alt="Salão do Nikola's, com o arco de ferro, a palmeira e as mesas postas"
          className="aspect-[4/5] rounded-[1.5rem]"
          sizes="(min-width: 768px) 40vw, 100vw"
        />
      </div>
      <div className="md:col-span-7 md:order-1">
        <h2 id="historia" className="font-display text-4xl md:text-5xl leading-tight text-balance">
          {anosDeTradicao} anos na mesma mesa da cidade
        </h2>
        <div className="mt-6 space-y-4 text-lg text-cafe leading-relaxed max-w-[58ch]">
          <p>
            O Nikola&rsquo;s começou em 1977, com o Sr. Nicola Tahan preparando as receitas num
            espaço pequeno no centro de Ouro Fino. A ideia era simples: comida boa e a sensação de
            estar em casa.
          </p>
          <p>
            De lá pra cá o restaurante cresceu e mudou várias vezes, mas o tempero e o jeito de
            receber continuam os mesmos. Aniversários, almoços de domingo, encontros de trabalho e
            paradas de quem cruza o sul de Minas: muita história da cidade passou por aqui.
          </p>
        </div>
        <Link href="/sobre" className="mt-6 inline-block font-semibold underline underline-offset-4 decoration-chope decoration-2 hover:text-verde">
          Conheça nossa história
        </Link>
      </div>
    </section>
  );
}
