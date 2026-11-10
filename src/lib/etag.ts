// O get() da Blob às vezes devolve o etag "fraco" (W/"..."), quando a
// resposta vem comprimida; o put() com ifMatch só aceita o etag forte e
// recusa o fraco sempre. Sem isto, arquivo que passa de certo tamanho
// (dia fechado da Caixinha, contagem de estoque, registro do mês) não
// grava mais.
export const forte = (etag: string) => etag.replace(/^W\//, "");
