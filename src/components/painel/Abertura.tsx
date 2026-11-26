"use client";

// A abertura do painel: ao abrir o app (ou carregar a página no computador),
// a tela creme com o monograma; a gota cai, assenta do lado do N e a tela some
// sozinha (só CSS, em painel.css). Uma vez por carregamento: trocar de tela
// dentro do painel não repete.

import { useEffect, useState } from "react";
import Monograma from "./Monograma";

let jaAbriu = false;

export default function Abertura() {
  // no primeiro carregamento o servidor já manda a abertura no HTML; depois, trocas de tela não a mostram
  const [mostrar] = useState(() => !jaAbriu);
  useEffect(() => {
    jaAbriu = true;
  }, []);
  if (!mostrar) return null;
  return (
    <div className="p-abertura" aria-hidden="true">
      <Monograma className="h-24 w-24 text-tinta" animar="uma" />
    </div>
  );
}
