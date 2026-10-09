// As áreas internas do site. Fora de usuarios.ts para as telas do navegador
// poderem usar sem puxar código de servidor.

export type Area = "cardapio" | "posts";

export const AREAS: Area[] = ["cardapio", "posts"];

export const ROTULO_AREA: Record<Area, string> = {
  cardapio: "Alterar cardápio",
  posts: "Posts do status (só ver, compartilhar e baixar)",
};
