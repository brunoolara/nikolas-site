"use client";

// A faixa com os dias do mês. Ao abrir, rola até o dia escolhido: no celular
// a faixa é mais larga que a tela e o dia de hoje ficava escondido à direita.

import { useEffect, useRef } from "react";

export default function FaixaDias({ children }: { children: React.ReactNode }) {
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = faixa.current;
    const atual = el?.querySelector<HTMLElement>('[aria-current="date"]');
    if (el && atual) el.scrollLeft = atual.offsetLeft - el.clientWidth / 2 + atual.clientWidth / 2;
  });

  return (
    <div ref={faixa} className="p-rolagem relative -mx-1 mt-4 flex gap-1.5 px-1 pb-1" aria-label="Dias do mês">
      {children}
    </div>
  );
}
