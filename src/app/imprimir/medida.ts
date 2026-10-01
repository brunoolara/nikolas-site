// Como se mede uma folha. Duas perguntas diferentes, duas medidas:
//
// 1. "O que não coube vai ser cortado na impressão?" — a folha tem
//    overflow: hidden, então some de verdade o que passa da borda dela. É o que
//    o AvisoEstouro pergunta, e por isso compara com a borda da folha, não com
//    a caixa do miolo: um prato que invade a área do rodapé fica feio, mas sai
//    impresso.
//
// 2. "O miolo passou do espaço que tem?" — é por aqui que a folha de domingo se
//    encaixa, porque lá a lista não pode nem chegar perto do rodapé. Não dá para
//    olhar o scrollHeight da folha: o miolo é um item flex com min-height 0,
//    fica do tamanho do espaço que sobrou e deixa o resto vazar sem aumentar
//    nada. Quem acusa é o próprio miolo.

const FOLGA = 4; // px de tolerância, para arredondamento do navegador

/** Avisado quando a folha de domingo termina de se encaixar (ver Encaixe.tsx). */
export const ENCAIXE_PRONTO = "encaixe-pronto";

/** O ponto mais baixo ocupado por algum conteúdo da folha. */
function fundo(folha: HTMLElement): number {
  let baixo = folha.getBoundingClientRect().top;
  folha.querySelectorAll<HTMLElement>("*").forEach((filho) => {
    const b = filho.getBoundingClientRect().bottom;
    if (b > baixo) baixo = b;
  });
  return baixo;
}

/**
 * Tem conteúdo que a folha vai cortar fora — ou o Encaixe.tsx já desistiu de
 * encaixar esta folha (marca `data-nao-coube`), que é o caso da de domingo
 * quando nem a lista mais justa dá conta.
 */
export function estourou(folha: HTMLElement): boolean {
  if (folha.hasAttribute("data-nao-coube")) return true;
  return fundo(folha) > folha.getBoundingClientRect().bottom + FOLGA;
}

/** O miolo passou do espaço que tem. */
export function mioloEstourou(folha: HTMLElement): boolean {
  const miolo = folha.querySelector<HTMLElement>(".miolo");
  return !!miolo && miolo.scrollHeight > miolo.clientHeight + FOLGA;
}
