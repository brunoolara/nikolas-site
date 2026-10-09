// Entrega uma foto da loja privada, só para quem entrou com acesso a posts.
// Com ?mini=1 devolve a miniatura da grade (360 px de largura, webp): a grade
// mostra dezenas de peças e a foto inteira só baixa quando alguém abre o post.

import sharp from "sharp";
import { pode } from "@/lib/acessos/sessao";
import { lerImagem, tipoImagem } from "@/lib/posts/armazem";
import { NOME_IMAGEM } from "@/lib/posts/tipos";

// o nome é único e a foto nunca muda: o celular pode guardar à vontade
const CACHE = "private, max-age=31536000, immutable";

export async function GET(req: Request, ctx: RouteContext<"/posts/imagem/[nome]">) {
  const { nome } = await ctx.params;
  if (!(await pode("posts"))) return new Response("Entre com usuário e senha.", { status: 401 });
  if (!NOME_IMAGEM.test(nome)) return new Response("Não encontrado.", { status: 404 });

  const stream = await lerImagem(nome);
  if (!stream) return new Response("Não encontrado.", { status: 404 });

  if (new URL(req.url).searchParams.has("mini")) {
    const original = Buffer.from(await new Response(stream).arrayBuffer());
    const mini = await sharp(original).resize({ width: 360 }).webp({ quality: 72 }).toBuffer();
    return new Response(new Uint8Array(mini), { headers: { "Content-Type": "image/webp", "Cache-Control": CACHE } });
  }

  return new Response(stream, { headers: { "Content-Type": tipoImagem(nome), "Cache-Control": CACHE } });
}
