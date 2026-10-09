"use client";

// Grade de miniaturas, como a galeria do celular. Tocar abre o post em tela
// cheia (PostAberto). O post aberto vai para o endereço (?post=id) pelo
// history do navegador — o Next acompanha sem ir ao servidor —, então o
// "voltar" do celular fecha o post em vez de sair da página.

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Post } from "@/lib/posts/tipos";
import PostAberto from "./PostAberto";

type Props = {
  posts: Post[];
  master: boolean;
  /** Banco: filtra pelo começo do título ("Executivo · …") e o tira da legenda da miniatura. */
  porTipo?: boolean;
  vazio: string;
};

const tipoDe = (titulo: string) => (titulo.includes(" · ") ? titulo.split(" · ")[0] : null);

export default function GradePosts({ posts, master, porTipo = false, vazio }: Props) {
  const busca = useSearchParams();
  const caminho = usePathname();
  const abertoAqui = useRef(false);
  const [tipo, setTipo] = useState<string | null>(null);

  const tipos = useMemo(
    () => (porTipo ? [...new Set(posts.map((p) => tipoDe(p.titulo)).filter((t): t is string => Boolean(t)))] : []),
    [posts, porTipo],
  );
  const visiveis = tipo ? posts.filter((p) => tipoDe(p.titulo) === tipo) : posts;
  const aberto = posts.find((p) => p.id === busca.get("post"));

  function abrir(id: string) {
    const q = new URLSearchParams(busca);
    q.set("post", id);
    abertoAqui.current = true;
    window.history.pushState(null, "", `${caminho}?${q}`);
  }

  const fechar = useCallback(() => {
    if (abertoAqui.current) {
      abertoAqui.current = false;
      window.history.back();
      return;
    }
    // chegou por um link com ?post=: só tira o post do endereço
    const q = new URLSearchParams(busca);
    q.delete("post");
    window.history.replaceState(null, "", q.size ? `${caminho}?${q}` : caminho);
  }, [busca, caminho]);

  return (
    <>
      {tipos.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[null, ...tipos].map((t) => (
            <button
              key={t ?? "todos"}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-full border px-3 py-1 text-sm ${
                tipo === t ? "border-verde bg-verde text-papel" : "border-linha text-cafe hover:bg-creme"
              }`}
            >
              {t ?? "Todos"}
            </button>
          ))}
        </div>
      ) : null}

      {visiveis.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {visiveis.map((p) => {
            const feito = Boolean(p.data && p.publicacoes.length);
            const legenda = porTipo && tipoDe(p.titulo) ? p.titulo.split(" · ").slice(1).join(" · ") : p.titulo;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => abrir(p.id)} className="group block w-full text-left">
                  <span className="relative block overflow-hidden rounded border border-linha group-hover:border-verde">
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto privada, servida pela nossa rota */}
                    <img
                      src={`/posts/imagem/${p.imagens[0]}?mini=1`}
                      alt=""
                      loading="lazy"
                      className={`aspect-[9/16] w-full object-cover ${feito ? "opacity-60" : ""}`}
                    />
                    {feito ? (
                      <span className="absolute right-1 top-1 rounded-full bg-verde px-1.5 text-xs font-semibold text-papel">
                        ✓
                      </span>
                    ) : null}
                    {p.imagens.length > 1 ? (
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-xs text-white">
                        {p.imagens.length} fotos
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-tight">{legenda}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded border border-dashed border-linha p-4 text-sm text-cafe">{vazio}</p>
      )}

      {aberto ? <PostAberto post={aberto} master={master} fechar={fechar} /> : null}
    </>
  );
}
