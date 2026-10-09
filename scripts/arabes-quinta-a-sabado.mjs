// Aplica no cardápio salvo (Vercel Blob) a regra de 2026-10-08: as especialidades árabes,
// menos o filé mignon à moda árabe, saem de quinta a sábado.
// Grava como o painel grava: versão nova em cardapio/atual.json + cópia datada no histórico.
//
//   node --env-file=.env.local scripts/arabes-quinta-a-sabado.mjs          (só mostra)
//   node --env-file=.env.local scripts/arabes-quinta-a-sabado.mjs --gravar
import { get, put } from "@vercel/blob";

const DIA = "Quinta a sábado";
const EXCECAO = "filé mignon à moda árabe";

const res = await get("cardapio/atual.json", { access: "private", useCache: false });
const cardapio = await new Response(res.stream).json();
const secao = cardapio.salao?.secoes?.find((s) => s.id === "arabes");
if (!secao) throw new Error("Seção arabes não encontrada no cardápio salvo.");

let mudou = 0;
for (const item of secao.itens) {
  const novo = item.nome.toLowerCase().startsWith(EXCECAO) ? item.dia : DIA;
  console.log(`${item.nome.padEnd(32)} ${String(item.dia ?? "—").padEnd(18)} -> ${novo ?? "—"}`);
  if (novo !== item.dia) { item.dia = novo; mudou++; }
}
console.log(`\nversão salva: ${cardapio.versao}, por ${cardapio.atualizadoPor} em ${cardapio.atualizadoEm}; itens a mudar: ${mudou}`);

if (process.argv.includes("--gravar") && mudou) {
  const agora = new Date();
  const novo = { ...cardapio, versao: (cardapio.versao ?? 0) + 1, atualizadoEm: agora.toISOString(),
    atualizadoPor: "Claude (a pedido do Bruno: árabes de quinta a sábado)" };
  const corpo = JSON.stringify(novo, null, 2);
  const op = { access: "private", contentType: "application/json" };
  await put("cardapio/atual.json", corpo, { ...op, allowOverwrite: true });
  await put(`cardapio/historico/${agora.toISOString().replace(/[:.]/g, "-")}.json`, corpo, op);
  console.log(`gravado: versão ${novo.versao}`);
}
