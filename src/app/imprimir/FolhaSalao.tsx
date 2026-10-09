/* eslint-disable @next/next/no-img-element -- peça impressa: o next/image embrulha
   a imagem e atrapalha o encaixe em milímetros na folha. */

// Uma folha do menu do salão. Serve tanto para o menu completo quanto para a
// folha avulsa de domingo — é a mesma peça, só muda quais folhas entram.

import {
  precoSalao,
  type FolhaSalao as Folha,
  type ItemSalao,
  type MenuSalao,
  type SecaoSalao,
} from "@/lib/menu/tipos";
import { restaurante } from "@/data/restaurante";

const SITE = restaurante.siteUrl.replace(/^https?:\/\//, "");

/** Cor como conteúdo (<svg>), nunca background — para sempre imprimir. */
function Fundo({ cor }: { cor: string }) {
  return (
    <svg className="fundo" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden focusable="false">
      <rect width="10" height="10" fill={cor} />
    </svg>
  );
}

function Linha({ item, duas }: { item: ItemSalao; duas: boolean }) {
  // Numa seção de duas colunas, item com preço único usa o pontilhado que
  // atravessa, para o valor cair na última coluna (é assim na peça impressa).
  const precoUnico = duas && item.precos.length < 2;
  const rotulo = item.dia || item.unidade;
  return (
    <li>
      <span className="nome">{item.nome}</span>
      <span className={precoUnico ? "pontos dupla" : "pontos"} />
      <span className="preco">{precoSalao(item, 0)}</span>
      {duas && !precoUnico ? <span className="preco">{precoSalao(item, 1)}</span> : null}
      {rotulo || item.desc ? (
        <span className="desc">
          {item.dia ? <span className="dia">{item.dia}</span> : null}
          {item.unidade ? <span className="u">{item.unidade}</span> : null}
          {item.desc}
        </span>
      ) : null}
    </li>
  );
}

export function Secao({ secao, mostrarTitulo = true }: { secao: SecaoSalao; mostrarTitulo?: boolean }) {
  const duas = Boolean(secao.colunas);
  return (
    <section className="bloco">
      {mostrarTitulo && secao.titulo ? <h3>{secao.titulo}</h3> : null}
      {secao.nota ? <p className="nota">{secao.nota}</p> : null}
      {secao.colunas ? (
        <div className="cab">
          <span />
          <span>{secao.colunas[0]}</span>
          <span>{secao.colunas[1]}</span>
        </div>
      ) : null}
      <ul className={duas ? "lista duas" : "lista"}>
        {secao.itens.map((item, i) => (
          <Linha key={`${item.nome}-${i}`} item={item} duas={duas} />
        ))}
      </ul>
    </section>
  );
}

/** Monta o miolo conforme o arranjo da folha, respeitando as colunas do original. */
function Miolo({ folha, achar, frase }: { folha: Folha; achar: (id: string) => SecaoSalao | undefined; frase: string }) {
  // cada folha pode ter frase própria no pé do bloco verde
  const fecho = folha.fecho ?? frase;
  const doGrupo = (ids: string[]) => ids.map(achar).filter(Boolean) as SecaoSalao[];
  const noQuadro = doGrupo(folha.quadroSecoes);

  const quadro = (extra = "") =>
    noQuadro.length ? (
      <aside className={`quadro ${extra}`.trim()}>
        <Fundo cor="#1e4b39" />
        <div>
          {noQuadro.map((s) => (
            <Secao key={s.id} secao={s} />
          ))}
        </div>
        <p className="fecho">{fecho}</p>
      </aside>
    ) : null;

  // lista à esquerda, bloco verde à direita
  if (folha.miolo === "lq") {
    return (
      <div className="miolo lq">
        <div>
          {doGrupo(folha.grupos[0] ?? []).map((s) => (
            <Secao key={s.id} secao={s} />
          ))}
        </div>
        {quadro()}
      </div>
    );
  }

  if (folha.miolo === "duas-col") {
    return (
      <div className="miolo duas-col">
        {folha.grupos.map((ids, i) => (
          <div key={i}>
            {doGrupo(ids).map((s) => (
              <Secao key={s.id} secao={s} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Arranjo simples. Com mais de um grupo, eles ficam lado a lado num bloco de
  // duas colunas e a faixa verde vem abaixo, ocupando a largura toda — é assim
  // na folha "Aves, peixes e especiais" do impresso. Empilhar estoura a página.
  const colunas = folha.grupos.filter((g) => g.length);
  return (
    <div className="miolo">
      {colunas.length > 1 ? (
        <div className="duas-col">
          {colunas.map((ids, i) => (
            <div key={i}>
              {doGrupo(ids).map((s) => (
                <Secao key={s.id} secao={s} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        doGrupo(colunas[0] ?? []).map((s) => <Secao key={s.id} secao={s} />)
      )}
      {quadro("banda")}
    </div>
  );
}

export default function FolhaSalao({
  folha,
  menu,
}: {
  folha: Folha;
  menu: MenuSalao;
}) {
  const achar = (id: string) => menu.secoes.find((s) => s.id === id);
  const classes = ["folha", "folha-salao", ...folha.variantes].join(" ");

  // ---- capa "Nossa história"
  if (folha.miolo === "hist") {
    const [lead, ...resto] = menu.historia;
    return (
      <section className={classes}>
        <Fundo cor="#fbf8f2" />
        <header className="topo">
          <h2>{folha.titulo}</h2>
          <img className="wm" src="/images/wordmark-preto.svg" alt="" />
        </header>
        <div className="miolo hist">
          <div className="texto">
            <p className="lead">{lead}</p>
            {resto.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <aside className="lado">
            <figure className="foto">
              <div className="falta">
                <Fundo cor="#f1ebdf" />
                <span>
                  Foto do Sr. Nicola e da Dona Zenaide
                  <small>66 × 88 mm — salvar como assets/nicola-zenaide.jpg</small>
                </span>
              </div>
            </figure>
            <div className="quadro citacao">
              <Fundo cor="#1e4b39" />
              <p className="como">
                A casa
                <span>desde 1977</span>
              </p>
              <blockquote>{menu.frase}</blockquote>
            </div>
          </aside>
        </div>
        <footer className="rodape">
          <span />
          <span>{SITE}</span>
          <img className="mono" src="/images/monograma-preto.svg" alt="" />
        </footer>
      </section>
    );
  }

  // ---- folha de domingo: abre com cabeçalho verde sangrado
  if (folha.abre) {
    return (
      <section className={classes}>
        <Fundo cor="#fbf8f2" />
        <header className="abre">
          <Fundo cor="#1e4b39" />
          <img className="wm" src="/images/wordmark-branco.svg" alt="" />
          <h2>{folha.titulo}</h2>
          {folha.eyebrow ? (
            <p className="eyebrow">
              <span />
              {folha.eyebrow}
              <span />
            </p>
          ) : null}
          {folha.frase ? <p className="frase">{folha.frase}</p> : null}
        </header>
        <Miolo folha={folha} achar={achar} frase={menu.frase} />
        <footer className="rodape">
          <span />
          <span>{SITE}</span>
          <img className="mono" src="/images/monograma-preto.svg" alt="" />
        </footer>
      </section>
    );
  }

  // ---- folhas comuns
  return (
    <section className={classes}>
      <Fundo cor="#fbf8f2" />
      <header className="topo">
        <h2>{folha.titulo}</h2>
        <img className="wm" src="/images/wordmark-preto.svg" alt="" />
      </header>
      <Miolo folha={folha} achar={achar} frase={menu.frase} />
      <footer className="rodape">
        <span />
        <span>{SITE}</span>
        <img className="mono" src="/images/monograma-preto.svg" alt="" />
      </footer>
    </section>
  );
}
