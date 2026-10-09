// Sobe um post para /posts direto daqui (Claude e os agentes), sem abrir o site.
//
//   node --env-file=.env.local scripts/publicar-post.mjs \
//     --titulo "Feijoada de sábado" --data 2026-10-10 --legenda "Hoje tem!" peca1.png peca2.jpg
//
// Sem --data, o post vai para o banco de posts. Aceita .jpg e .png, na ordem
// em que vão para o status. --listar mostra o que já está lá.
//
// Grava na mesma Blob privada que o site lê (precisa do BLOB_READ_WRITE_TOKEN
// do .env.local) — o que subir aqui aparece em produção na hora.

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parseArgs } from "node:util";
import { get, put } from "@vercel/blob";

const LISTA = "posts/lista.json";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    titulo: { type: "string" },
    data: { type: "string" },
    legenda: { type: "string" },
    listar: { type: "boolean" },
  },
});

async function lerLista() {
  const res = await get(LISTA, { access: "private", useCache: false }).catch(() => null);
  if (!res || res.statusCode !== 200 || !res.stream) return [];
  return new Response(res.stream).json();
}

const posts = await lerLista();

if (values.listar) {
  for (const p of posts.sort((a, b) => (a.data ?? "9").localeCompare(b.data ?? "9"))) {
    const feito = p.publicacoes.length ? ` · publicado ${p.publicacoes.length}x` : "";
    console.log(`${p.data ?? "banco     "}  ${p.titulo}  (${p.imagens.length} foto(s))${feito}  id=${p.id}`);
  }
} else {
  await publicar();
}

// process.exit logo depois do SDK da Blob derruba o Node no Windows (assert do libuv): sai pelo fim
async function publicar() {
  if (!values.titulo || !positionals.length) {
    console.error('Uso: --titulo "..." [--data AAAA-MM-DD] [--legenda "..."] foto1.png [foto2.jpg ...]');
    process.exitCode = 1;
    return;
  }
  if (values.data && !/^\d{4}-\d{2}-\d{2}$/.test(values.data)) {
    console.error("--data no formato AAAA-MM-DD (ou sem --data para o banco de posts).");
    process.exitCode = 1;
    return;
  }

  const imagens = [];
  for (const caminho of positionals) {
    const ext = extname(caminho).toLowerCase();
    const tipo = ext === ".png" ? "png" : ext === ".jpg" || ext === ".jpeg" ? "jpg" : null;
    if (!tipo) {
      console.error(`${caminho}: só .jpg ou .png.`);
      process.exitCode = 1;
      return;
    }
    const conteudo = await readFile(caminho);
    if (conteudo.length > 8 * 1024 * 1024) {
      console.error(`${caminho}: passa de 8 MB — reduza antes (story é 1080x1920).`);
      process.exitCode = 1;
      return;
    }
    const nome = `${randomUUID()}.${tipo}`;
    await put(`posts/img/${nome}`, conteudo, { access: "private", contentType: tipo === "png" ? "image/png" : "image/jpeg" });
    imagens.push(nome);
    console.log(`foto enviada: ${caminho}`);
  }

  // relê antes de gravar, para não apagar algo que mudou no site enquanto as fotos subiam
  const atual = await lerLista();
  const post = {
    id: randomUUID(),
    titulo: values.titulo.trim(),
    data: values.data ?? null,
    ...(values.legenda?.trim() ? { legenda: values.legenda.trim() } : {}),
    imagens,
    criadoEm: new Date().toISOString(),
    publicacoes: [],
  };
  await put(LISTA, JSON.stringify([...atual, post], null, 2), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
  });
  console.log(`post publicado em /posts: "${post.titulo}" (${post.data ?? "banco de posts"}) id=${post.id}`);
}
