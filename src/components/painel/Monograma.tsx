// O monograma oficial "N." desenhado em vetor, com a gota separada do N para
// poder cair (pedido do Bruno em 26/11/2026): a gota desce de cima e para do
// lado do N, assentando com um leve achatamento, como uma gota de verdade.
//
// - animar="uma": cai uma vez (abertura do app).
// - animar="sempre": cai, fica um instante e cai de novo (telas carregando).
// Quem pede menos movimento no aparelho vê o monograma parado (painel.css).

import { MONOGRAMA_GOTA, MONOGRAMA_N } from "./monograma-tracos";

type Props = { className?: string; animar?: "uma" | "sempre"; cor?: string };

export default function Monograma({ className = "h-12 w-12", animar, cor = "currentColor" }: Props) {
  return (
    <svg viewBox="0 0 1240 1240" className={className} fill={cor} role="img" aria-label="Nikola's" overflow="visible">
      <g transform={`translate(${MONOGRAMA_N.x},${MONOGRAMA_N.y})`}>
        <path d={MONOGRAMA_N.d} />
      </g>
      <g className={animar ? `p-gota p-gota-${animar}` : undefined}>
        <g transform={`translate(${MONOGRAMA_GOTA.x},${MONOGRAMA_GOTA.y})`}>
          <path d={MONOGRAMA_GOTA.d} />
        </g>
      </g>
    </svg>
  );
}
