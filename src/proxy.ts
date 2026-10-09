// Separa o site público do painel interno pelo endereço.
//
// - painel.nikolasrestaurante.com.br: a raiz é a porta de entrada (login e
//   escolha da área); as páginas internas moram aqui. Página do site público
//   aberta pelo painel volta para o www.
// - www.nikolasrestaurante.com.br: não tem página interna nenhuma. Quem abrir
//   /posts, /alterar-cardapio etc. (ou o /admin antigo) vai para o painel.
//
// O login continua sendo o que protege; isto organiza e mantém o cookie de
// sessão só no painel (ele é gravado sem domínio, então não vai para o www).
// Em desenvolvimento, painel.localhost:3000 faz o papel do painel.

import { NextResponse, type NextRequest } from "next/server";

const INTERNAS = ["/alterar-cardapio", "/posts", "/acessos", "/imprimir", "/painel"];
const ANTIGAS: [string, string][] = [["/admin", "/alterar-cardapio"]];
const DOMINIO = "nikolasrestaurante.com.br";

const dentro = (caminho: string, raiz: string) => caminho === raiz || caminho.startsWith(`${raiz}/`);

/** Endereço do painel para quem está no site público; null em previews da Vercel. */
function painelDe(host: string, protocolo: string): string | null {
  if (host === DOMINIO || host === `www.${DOMINIO}`) return `https://painel.${DOMINIO}`;
  if (host.startsWith("localhost")) return `${protocolo}//painel.${host}`;
  return null;
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const noPainel = host.startsWith("painel.");

  let caminho = url.pathname;
  for (const [velho, novo] of ANTIGAS) if (dentro(caminho, velho)) caminho = novo + caminho.slice(velho.length);

  if (noPainel) {
    if (caminho === "/robots.txt")
      return new NextResponse("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
    if (caminho === "/") return NextResponse.rewrite(new URL("/painel", url));
    if (caminho !== url.pathname) return NextResponse.redirect(new URL(caminho + url.search, url), 308);
    if (INTERNAS.some((r) => dentro(caminho, r))) return NextResponse.next();
    // página do site público: o painel não serve, manda para o www
    const site = host.startsWith("painel.localhost") ? host.replace("painel.", "") : `www.${DOMINIO}`;
    return NextResponse.redirect(new URL(caminho + url.search, `${url.protocol}//${site}`), 308);
  }

  if (caminho !== url.pathname || INTERNAS.some((r) => dentro(caminho, r))) {
    const painel = painelDe(host, url.protocol);
    if (!painel) return NextResponse.next();
    const destino = caminho === "/painel" ? "/" : caminho;
    return NextResponse.redirect(new URL(destino + url.search, painel), 308);
  }
  return NextResponse.next();
}

export const config = {
  // tudo menos arquivos do Next e arquivos com extensão (fotos, ícones), mais o robots
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)", "/robots.txt"],
};
