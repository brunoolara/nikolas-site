"use client";

// Um post na lista: as fotos, a legenda e o que a equipe faz com ele.
//
// "Postar no status" usa o compartilhamento do celular (Web Share). Nenhum
// site consegue abrir direto o status do WhatsApp: abre a folha de
// compartilhamento, a pessoa toca em WhatsApp e escolhe "Meu status".
// As fotos são baixadas antes do toque porque o Safari só deixa compartilhar
// logo depois dele — esperar o download no clique quebra. Mas só quando o post
// aparece na tela: com o banco e duas semanas de agenda, baixar tudo ao abrir
// seriam dezenas de MB no celular da equipe.

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Post } from "@/lib/posts/tipos";
import { acaoMarcarPublicado } from "./acoes";

const src = (nome: string) => `/posts/imagem/${nome}`;
const arquivo = (nome: string, i: number) => `nikolas-${i + 1}.${nome.split(".").pop()}`;

export default function CartaoPost({ post, master }: { post: Post; master: boolean }) {
  const cartao = useRef<HTMLElement>(null);
  const arquivos = useRef<File[] | null>(null);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);
  const [aviso, setAviso] = useState("");
  const [marcando, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;
    const baixar = () =>
      Promise.all(
        post.imagens.map(async (nome, i) => {
          const blob = await (await fetch(src(nome))).blob();
          return new File([blob], arquivo(nome, i), { type: blob.type });
        }),
      )
        .then((files) => {
          if (!vivo) return;
          arquivos.current = files;
          setPodeCompartilhar(Boolean(navigator.canShare?.({ files })));
        })
        .catch(() => {});
    const olho = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        olho.disconnect();
        baixar();
      },
      { rootMargin: "300px" },
    );
    if (cartao.current) olho.observe(cartao.current);
    return () => {
      vivo = false;
      olho.disconnect();
    };
  }, [post.imagens]);

  async function compartilhar() {
    if (!arquivos.current) return;
    try {
      await navigator.share({ files: arquivos.current });
    } catch {
      // a pessoa fechou a folha de compartilhamento: nada a fazer
    }
  }

  async function copiar() {
    if (!post.legenda) return;
    await navigator.clipboard.writeText(post.legenda);
    setAviso("Legenda copiada.");
  }

  function marcar(desfazer = false) {
    iniciar(async () => {
      const r = await acaoMarcarPublicado(post.id, desfazer);
      setAviso(r.ok ? "" : r.mensagem);
    });
  }

  const ultima = post.publicacoes.at(-1);
  // da agenda, uma publicação basta; do banco, sempre dá para usar de novo
  const feito = Boolean(post.data && ultima);

  return (
    <article ref={cartao} className={`rounded border p-4 ${feito ? "border-linha opacity-70" : "border-verde"}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{post.titulo}</h3>
        {master ? (
          <Link href={`/posts/${post.id}`} className="shrink-0 text-sm text-verde underline">
            Editar
          </Link>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {post.imagens.map((nome, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- foto privada, servida pela nossa rota
          <img key={nome} src={src(nome)} alt={`Foto ${i + 1}`} loading="lazy" className="h-48 w-auto rounded border border-linha" />
        ))}
      </div>

      {post.legenda ? <p className="mt-3 whitespace-pre-line text-sm">{post.legenda}</p> : null}

      {ultima ? (
        <p className="mt-3 text-sm text-verde">
          ✓ Publicado por {ultima.por} em{" "}
          {new Date(ultima.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {podeCompartilhar ? (
          <button
            type="button"
            onClick={compartilhar}
            className="rounded bg-verde px-4 py-2.5 text-sm font-semibold text-papel hover:bg-verde-escuro"
          >
            Postar no status do WhatsApp
          </button>
        ) : null}
        {post.legenda ? (
          <button type="button" onClick={copiar} className="rounded border border-linha px-3 py-2 text-sm">
            Copiar legenda
          </button>
        ) : null}
        {post.imagens.map((nome, i) => (
          <a
            key={nome}
            href={src(nome)}
            download={arquivo(nome, i)}
            className="rounded border border-linha px-3 py-2 text-sm"
          >
            {post.imagens.length > 1 ? `Baixar foto ${i + 1}` : "Baixar foto"}
          </a>
        ))}
        {feito ? (
          <button
            type="button"
            disabled={marcando}
            onClick={() => marcar(true)}
            className="px-3 py-2 text-sm text-cafe underline"
          >
            Desfazer
          </button>
        ) : (
          <button
            type="button"
            disabled={marcando}
            onClick={() => marcar()}
            className="rounded border border-verde px-3 py-2 text-sm font-semibold text-verde"
          >
            {marcando ? "Marcando…" : "Marcar como publicado"}
          </button>
        )}
      </div>

      {podeCompartilhar ? null : (
        <p className="mt-2 text-xs text-cafe">No celular aparece o botão de postar direto no status.</p>
      )}
      {aviso ? <p className="mt-2 text-sm text-cafe">{aviso}</p> : null}
    </article>
  );
}
