// Menu executivo pronto para imprimir: frente (capa) e verso, em A4.
// Lê o cardápio do Blob, então é sempre a versão que o restaurante salvou.
// O funcionário abre esta página e aperta Ctrl+P — nenhuma cor depende de
// "Gráficos de fundo", então sai certo com as opções padrão do navegador.

/* eslint-disable @next/next/no-img-element -- peça impressa: o next/image
   embrulha a imagem e atrapalha o encaixe em milímetros na folha. */
import type { Metadata } from "next";
import { lerCardapio } from "@/lib/menu/armazem";
import { especiaisComPratos, formatarPreco, ROTULO_DIA, type Item, type Secao } from "@/lib/menu/tipos";
import { restaurante } from "@/data/restaurante";
import BarraImpressao from "../BarraImpressao";
import AvisoEstouro from "../AvisoEstouro";
import "../imprimir.css";

export const metadata: Metadata = {
  title: "Menu executivo para impressão",
  robots: { index: false, follow: false },
};

// nunca servir de cache: o funcionário salva e imprime em seguida
export const dynamic = "force-dynamic";

const SITE = restaurante.siteUrl.replace(/^https?:\/\//, "");

/** Retângulo de cor como conteúdo (<svg>), e não background — para sempre imprimir. */
function Fundo({ cor }: { cor: string }) {
  return (
    <svg className="fundo" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden focusable="false">
      <rect width="10" height="10" fill={cor} />
    </svg>
  );
}

function Linha({ item }: { item: Item }) {
  return (
    <li>
      <span className="nome">{item.nome}</span>
      <span className="pontos" />
      <span className="preco">{formatarPreco(item.preco)}</span>
      {item.desc ? <span className="desc">{item.desc}</span> : null}
    </li>
  );
}

function Bloco({ secao, className = "" }: { secao: Secao; className?: string }) {
  return (
    <section className={`bloco ${className}`.trim()}>
      <h3>{secao.titulo}</h3>
      {secao.nota ? <p className="nota">{secao.nota}</p> : null}
      <ul className="lista">
        {secao.itens.map((item, i) => (
          <Linha key={`${item.nome}-${i}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

export default async function MenuExecutivoImpressao() {
  const { executivo } = await lerCardapio();
  const porId = new Map(executivo.secoes.map((s) => [s.id, s]));
  const diarios = porId.get("diarios");
  const salada = porId.get("salada");
  const adicionais = porId.get("adicionais");
  const proteinas = porId.get("proteinas");
  const especiais = especiaisComPratos(executivo);

  return (
    <div className="papel-fora">
      <BarraImpressao voltarPara="/admin/executivo" />
      <AvisoEstouro />

      {/* ---------- frente ---------- */}
      <section className="folha capa">
        <img className="foto" src="/images/capa-executivo.jpg" alt="" />
        <div className="moldura" />
        <div className="conteudo">
          <img
            className="wordmark"
            src="/images/wordmark-branco.svg"
            alt="Nikola's Restaurante — desde 1977"
          />
          <h1>{executivo.titulo}</h1>
          <p className="horario">
            <span />
            {executivo.horario}
            <span />
          </p>
          <p className="frase">{executivo.frase}</p>
        </div>
        <p className="site">{SITE}</p>
      </section>

      {/* ---------- verso ---------- */}
      <section className="folha verso">
        <Fundo cor="#fbf8f2" />
        <header className="topo">
          <h2>{executivo.titulo}</h2>
          <p className="quando">{executivo.horario}</p>
        </header>

        <div className="colunas">
          <div className="esquerda">
            {diarios ? <Bloco secao={diarios} /> : null}
            {salada ? <Bloco secao={salada} /> : null}
            {(adicionais || proteinas) && (
              <div className="bloco duplo">
                {adicionais ? <Bloco secao={adicionais} /> : null}
                {proteinas ? <Bloco secao={proteinas} /> : null}
              </div>
            )}
          </div>

          <aside className="quadro">
            <Fundo cor="#1e4b39" />
            <h3>Especiais do dia</h3>
            <p className="nota">Um prato diferente a cada dia da semana.</p>
            {especiais.map((esp) => (
              <div className="dia" key={esp.dia}>
                <p className="rotulo-dia">{ROTULO_DIA[esp.dia]}</p>
                <ul className="lista">
                  {esp.itens.map((item, i) => (
                    <Linha key={`${item.nome}-${i}`} item={item} />
                  ))}
                </ul>
              </div>
            ))}
            <p className="fecho">{executivo.frase}</p>
          </aside>
        </div>

        <footer className="rodape">{SITE}</footer>
      </section>
    </div>
  );
}
