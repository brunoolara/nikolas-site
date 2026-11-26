// Uma linha por pessoa para pagar e mandar o comprovante: de um pagamento
// feito ou, com os dias ainda abertos, a prévia.
//
// Desde 25/11/2026 cada linha traz a chave Pix da pessoa (cadastrada no
// Perfil ou na Equipe) para copiar e, depois de fechado, o "Pix copia e cola"
// já com o valor. Na prévia não: o valor ainda pode mudar até o fechamento.
// Chave trocada nos últimos 14 dias vem marcada, para conferir antes de pagar.

import { cache } from "react";
import Link from "next/link";
import { lerEquipe } from "@/lib/caixinha/armazem";
import { consulta, type Fonte } from "@/lib/caixinha/comprovante";
import { chaveParaCopiar, mostrarChave, pixComValor, ROTULO_PIX } from "@/lib/caixinha/pix";
import { reais, type LinhaPagamento } from "@/lib/caixinha/tipos";
import { hoje, somarDias } from "@/lib/posts/tipos";
import BotoesPix from "./BotoesPix";

/** A tela do dia pode ter dois blocos destes: a equipe é lida uma vez só. */
const equipeDaVez = cache(lerEquipe);

const DIAS_CHAVE_NOVA = 14;
const diaDe = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export default async function Comprovantes({
  fonte,
  linhas,
  titulo,
}: {
  fonte: Fonte;
  linhas: LinhaPagamento[];
  /** Complemento do título, ex. "do almoço". */
  titulo?: string;
}) {
  const previa = !("id" in fonte);
  if (!linhas.length) return null;
  const equipe = await equipeDaVez();
  const desde = somarDias(hoje(), -DIAS_CHAVE_NOVA);

  return (
    <section className="p-cartao mt-6 p-5">
      <h3 className="p-cartao-titulo">
        {previa ? "Prévia: Pix e comprovantes" : "Pix e comprovantes"}
        {titulo ? ` ${titulo}` : ""}
      </h3>
      <p className="mt-1 text-sm text-cafe">
        {previa
          ? "Ainda não fechado: os valores podem mudar até o fechamento, por isso o Pix com valor só aparece depois de fechar."
          : "Copie a chave, ou o Pix já com o valor, e pague no app do banco."}{" "}
        Toque no nome para abrir o comprovante e mandar no WhatsApp.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {linhas.map((l) => {
          const p = equipe.find((x) => x.id === l.pessoa);
          const pix = p?.pix;
          const trocada = pix ? diaDe(pix.em) : "";
          return (
            <li key={l.pessoa} className="rounded-[var(--p-raio-sm)] border border-linha">
              <Link
                href={`/caixinha/comprovante?${consulta(fonte, l.pessoa)}`}
                className="flex min-h-12 items-center justify-between gap-3 px-3 hover:text-verde"
              >
                <span className="font-semibold">{l.nome}</span>
                <span className="text-sm tabular-nums text-cafe">{reais(l.pagar)} ›</span>
              </Link>
              <div className="border-t border-linha/70 px-3 py-2.5">
                {pix ? (
                  <BotoesPix
                    rotulo={ROTULO_PIX[pix.tipo]}
                    mostrar={mostrarChave(pix)}
                    chave={chaveParaCopiar(pix)}
                    codigo={!previa && l.pagar > 0 ? pixComValor(pix, l.pagar, p?.nome ?? l.nome) : null}
                    nova={trocada >= desde ? `${trocada.slice(8, 10)}/${trocada.slice(5, 7)}` : null}
                  />
                ) : (
                  <p className="text-xs text-cafe">
                    Sem chave Pix.{" "}
                    <Link href="/caixinha/equipe" className="font-semibold text-verde hover:underline">
                      Cadastrar na Equipe
                    </Link>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
