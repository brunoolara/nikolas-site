// Contagem semanal do estoque (segunda a domingo). A semana fica no endereço
// (?semana=AAAA-MM-DD, a segunda-feira); sem ela, a semana de hoje.

import Link from "next/link";
import { exigir } from "@/lib/acessos/sessao";
import { hoje } from "@/lib/posts/tipos";
import { lerAjustes, lerContagem } from "@/lib/estoque/armazem";
import { rotuloSemana, semanaDe, somarDias } from "@/lib/estoque/categorias";
import { itensDaContagem, lerInsumos } from "@/lib/estoque/insumos";
import { mensagemDe } from "@/lib/takeat/cliente";
import Cabecalho from "@/components/painel/Cabecalho";
import Contagem from "./Contagem";

export default async function Estoque({ searchParams }: PageProps<"/estoque">) {
  const { sessao, liberado } = await exigir("estoque");
  if (!liberado) return null;
  const busca = await searchParams;
  const atual = semanaDe(hoje());
  const pedida = typeof busca.semana === "string" ? busca.semana : "";
  const semana = /^\d{4}-\d{2}-\d{2}$/.test(pedida) && semanaDe(pedida) === pedida ? pedida : atual;
  const link = (s: string) => (s === atual ? "/estoque" : `/estoque?semana=${s}`);

  const [contagem, ajustes] = await Promise.all([lerContagem(semana), lerAjustes()]);
  let erro = "";
  let insumos: Awaited<ReturnType<typeof lerInsumos>>["insumos"] = [];
  try {
    insumos = (await lerInsumos()).insumos;
  } catch (e) {
    erro = mensagemDe(e);
  }
  const itens = itensDaContagem(insumos, ajustes);
  const valores = Object.fromEntries(Object.entries(contagem.itens).map(([id, l]) => [id, l.qtd]));
  const fechada = contagem.fechada;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Contagem de estoque"
        descricao="Conte o que tem de cada item, na unidade indicada. Pode contar aos poucos: cada número grava na hora."
        acoes={
          sessao.master ? (
            <Link href="/estoque/itens" className="p-btn p-btn-secundario">
              Organizar itens
            </Link>
          ) : null
        }
      />

      <nav className="p-cartao mt-6 flex items-center justify-between gap-2 p-3" aria-label="Escolher a semana">
        <Link href={link(somarDias(semana, -7))} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Semana anterior">
          ‹
        </Link>
        <div className="text-center">
          <h2 className="font-display text-2xl">Semana {rotuloSemana(semana)}</h2>
          {semana === atual ? (
            <p className="text-sm text-cafe">Semana atual</p>
          ) : (
            <Link href="/estoque" className="text-sm font-semibold text-verde hover:underline">
              Ir para a semana atual
            </Link>
          )}
        </div>
        <Link href={link(somarDias(semana, 7))} className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg" aria-label="Próxima semana">
          ›
        </Link>
      </nav>

      {fechada ? (
        <p className="p-aviso p-aviso-ok mt-4">
          Fechada por {fechada.por} em{" "}
          {new Date(fechada.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
          {fechada.semTakeat ? `, sem o saldo da Takeat (${fechada.semTakeat}).` : ", com o saldo da Takeat guardado."}
        </p>
      ) : null}

      {erro ? (
        <p className="p-aviso p-aviso-alerta mt-4">
          Não consegui ler os itens da Takeat: {erro}
        </p>
      ) : (
        <Contagem
          key={`${semana}-${fechada ? "f" : "a"}`}
          semana={semana}
          itens={itens}
          valores={valores}
          fechada={Boolean(fechada)}
          master={sessao.master}
        />
      )}
    </div>
  );
}
