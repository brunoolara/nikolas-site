"use client";

// Criar ou editar um post. As fotos são reduzidas aqui no navegador para o
// tamanho de status (lado maior 1920 px) antes de subir: foto de celular tem
// 4–8 MB e passaria do limite de envio; reduzida fica em algumas centenas de KB
// sem perda visível no status.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Post } from "@/lib/posts/tipos";
import { acaoExcluirPost, acaoSalvarPost } from "./acoes";
import Mover, { mover } from "../alterar-cardapio/Mover";

const LADO_MAIOR = 1920;

async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAIOR / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("toBlob"))), "image/jpeg", 0.88),
  );
}

export default function EditorPost({ post }: { post?: Post }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(post?.titulo ?? "");
  const [noBanco, setNoBanco] = useState(post ? !post.data : false);
  const [data, setData] = useState(post?.data ?? "");
  const [legenda, setLegenda] = useState(post?.legenda ?? "");
  const [imagens, setImagens] = useState<string[]>(post?.imagens ?? []);
  const [enviando, setEnviando] = useState(0);
  const [aviso, setAviso] = useState("");
  const [salvando, iniciar] = useTransition();

  async function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    setAviso("");
    const arquivos = [...lista];
    setEnviando((n) => n + arquivos.length);
    for (const arquivo of arquivos) {
      try {
        const corpo = new FormData();
        corpo.append("foto", await reduzir(arquivo), "foto.jpg");
        const res = await fetch("/posts/enviar", { method: "POST", body: corpo });
        const r = (await res.json()) as { nome?: string; erro?: string };
        if (r.nome) setImagens((atual) => [...atual, r.nome!]);
        else setAviso(r.erro ?? "Não consegui enviar uma das fotos.");
      } catch {
        setAviso(`Não consegui ler a foto "${arquivo.name}".`);
      } finally {
        setEnviando((n) => n - 1);
      }
    }
  }

  function salvar() {
    if (!noBanco && !data) {
      setAviso("Escolha o dia, ou marque que vai para o banco de posts.");
      return;
    }
    iniciar(async () => {
      const r = await acaoSalvarPost({ id: post?.id, titulo, data: noBanco ? null : data, legenda, imagens });
      if (r.ok) router.push("/posts");
      else setAviso(r.mensagem);
    });
  }

  function excluir() {
    if (!post || !window.confirm("Excluir este post e as fotos dele?")) return;
    iniciar(async () => {
      const r = await acaoExcluirPost(post.id);
      if (r.ok) router.push("/posts");
      else setAviso(r.mensagem);
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex items-center justify-between gap-3 border-b border-linha pb-4">
        <h1 className="font-display text-3xl">{post ? "Editar post" : "Novo post"}</h1>
        <Link href="/posts" className="text-sm text-cafe underline">
          Voltar
        </Link>
      </header>

      <label className="mt-6 block text-sm font-semibold" htmlFor="titulo">
        Título <span className="font-normal text-cafe">(só para a equipe saber qual é)</span>
      </label>
      <input
        id="titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ex.: Feijoada de sábado"
        className="mt-1 w-full rounded border border-linha bg-white px-3 py-2.5"
      />

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Quando sai</legend>
        <label className="mt-2 flex items-center gap-2">
          <input type="radio" checked={!noBanco} onChange={() => setNoBanco(false)} />
          Num dia certo:
          <input
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setNoBanco(false);
            }}
            className="rounded border border-linha bg-white px-2 py-1.5"
          />
        </label>
        <label className="mt-2 flex items-center gap-2">
          <input type="radio" checked={noBanco} onChange={() => setNoBanco(true)} />
          Banco de posts (qualquer dia)
        </label>
      </fieldset>

      <p className="mt-6 text-sm font-semibold">Fotos</p>
      <p className="text-sm text-cafe">Na ordem em que vão aparecer no status. Formato em pé (9:16) fica melhor.</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {imagens.map((nome, i) => (
          <div key={nome} className="rounded border border-linha p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto privada, servida pela nossa rota */}
            <img src={`/posts/imagem/${nome}`} alt={`Foto ${i + 1}`} className="aspect-[9/16] w-full rounded object-cover" />
            <div className="mt-2 flex items-center justify-between">
              <Mover indice={i} total={imagens.length} aoMover={(para) => setImagens((atual) => mover(atual, i, para))} oQue="foto" />
              <button
                type="button"
                onClick={() => setImagens((atual) => atual.filter((n) => n !== nome))}
                className="text-sm text-red-700 underline"
              >
                Tirar
              </button>
            </div>
          </div>
        ))}
        <label className="flex aspect-[9/16] cursor-pointer items-center justify-center rounded border border-dashed border-linha p-2 text-center text-sm text-cafe hover:border-verde">
          {enviando ? `Enviando ${enviando}…` : "+ Adicionar fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              adicionar(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <label className="mt-6 block text-sm font-semibold" htmlFor="legenda">
        Legenda <span className="font-normal text-cafe">(opcional — a equipe copia com um toque)</span>
      </label>
      <textarea
        id="legenda"
        value={legenda}
        onChange={(e) => setLegenda(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded border border-linha bg-white px-3 py-2.5"
      />

      {aviso ? <p className="mt-4 text-sm font-medium text-red-700">{aviso}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || enviando > 0}
          className="rounded bg-verde px-5 py-3 font-semibold text-papel hover:bg-verde-escuro disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar post"}
        </button>
        {post ? (
          <button type="button" onClick={excluir} disabled={salvando} className="text-sm text-red-700 underline">
            Excluir post
          </button>
        ) : null}
      </div>
    </div>
  );
}
