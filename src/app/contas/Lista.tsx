"use client";

// A lista do celular: contas em aberto por prazo, cada uma com "Copiar
// código" (a chave Pix ou o código do boleto que foi colado na Takeat) e
// "Paguei", que pergunta conta, forma e dia e dá a baixa na Takeat. Depois
// de pagar, a conta sai da lista (a Takeat já não a devolve em aberto) e fica
// em "Pagas agora", com "Desfazer", até a tela ser recarregada.

import { useRef, useState, useTransition } from "react";
import type { Conta, Opcao } from "@/lib/contas/takeat";
import { lerCodigo, ROTULO_CODIGO, type TipoCodigo } from "@/lib/contas/codigo";
import { reais } from "@/lib/caixinha/tipos";
import { rotuloData, somarDias } from "@/lib/posts/tipos";
import { acaoDesfazer, acaoPaguei } from "./acoes";

type Props = { contas: Conta[]; bancos: Opcao[]; formas: Opcao[]; hoje: string };

const ddmm = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

// Os mesmos cortes dos números do topo, para os totais baterem.
function grupos(contas: Conta[], hoje: string) {
  const semana = somarDias(hoje, 7);
  const lista = [
    { nome: "Vencidas", contas: contas.filter((c) => c.vencimento < hoje), aberto: true },
    { nome: "Hoje", contas: contas.filter((c) => c.vencimento === hoje), aberto: true },
    { nome: "Próximos 7 dias", contas: contas.filter((c) => c.vencimento > hoje && c.vencimento <= semana), aberto: true },
    { nome: "Mais para frente", contas: contas.filter((c) => c.vencimento > semana), aberto: false },
  ];
  return lista.filter((g) => g.contas.length);
}

/** Copia pelo jeito novo; se o navegador recusar, pelo antigo. */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, texto.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

function formaSugerida(conta: Conta, tipo: TipoCodigo, formas: Opcao[]): number | null {
  const procurar = (nome: string) => formas.find((f) => f.nome.toLowerCase() === nome)?.id ?? null;
  // pelo nome: a forma da conta pode ser a repetida que saiu da lista
  if (conta.forma) return procurar(conta.forma.toLowerCase()) ?? conta.formaId;
  if (tipo === "boleto" || tipo === "consumo") return procurar("boleto");
  if (tipo === "pix" || tipo === "chave") return procurar("pix");
  return null;
}

export default function Lista({ contas, bancos, formas, hoje }: Props) {
  const [pagas, setPagas] = useState<Record<number, { conta: Conta; dia: string }>>({});
  const [copiado, setCopiado] = useState<number | null>(null);
  const [aberta, setAberta] = useState<Conta | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  const janela = useRef<HTMLDialogElement>(null);
  const contaPadrao = bancos.find((b) => /caixa/i.test(b.nome))?.id ?? bancos[0]?.id ?? 0;

  async function copiar(conta: Conta, texto: string) {
    if (await copiarTexto(texto)) {
      setCopiado(conta.id);
      setTimeout(() => setCopiado((c) => (c === conta.id ? null : c)), 4000);
    } else setErro("Não consegui copiar. Toque e segure no código para copiar à mão.");
  }

  function abrir(conta: Conta) {
    setErro("");
    setAberta(conta);
    janela.current?.showModal();
  }

  function confirmar(form: FormData) {
    const conta = aberta;
    if (!conta) return;
    const forma = Number(form.get("forma"));
    const dados = {
      dia: String(form.get("dia")),
      contaId: Number(form.get("conta")),
      formaId: forma > 0 ? forma : null,
      titulo: conta.titulo,
      valor: conta.valor,
    };
    iniciar(async () => {
      const r = await acaoPaguei(conta.id, dados);
      if (!r.ok) {
        setErro(r.mensagem);
        return;
      }
      setPagas((p) => ({ ...p, [conta.id]: { conta, dia: dados.dia } }));
      janela.current?.close();
    });
  }

  function desfazer(conta: Conta) {
    setErro("");
    iniciar(async () => {
      const r = await acaoDesfazer(conta.id, conta.titulo, conta.valor);
      if (!r.ok) {
        setErro(r.mensagem);
        return;
      }
      setPagas((p) => {
        const novo = { ...p };
        delete novo[conta.id];
        return novo;
      });
    });
  }

  const codigoAberta = aberta ? lerCodigo(aberta.codigo, hoje) : null;
  const pagasAgora = Object.values(pagas);
  const emAberto = contas.filter((c) => !pagas[c.id]);

  return (
    <>
      {erro && !aberta ? (
        <p role="alert" className="p-aviso p-aviso-erro mt-6">
          {erro}
        </p>
      ) : null}

      {pagasAgora.length ? (
        <section className="mt-8">
          <h2 className="font-display text-xl">Pagas agora</h2>
          <ul className="mt-3 space-y-3">
            {pagasAgora.map(({ conta, dia }) => (
              <Cartao
                key={conta.id}
                conta={conta}
                hoje={hoje}
                pagaEm={dia}
                copiado={false}
                ocupado={ocupado}
                aoCopiar={copiar}
                aoPagar={abrir}
                aoDesfazer={desfazer}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {!emAberto.length ? (
        <p className="mt-8 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">
          Nenhuma conta em aberto lançada na Takeat para os próximos 60 dias.
        </p>
      ) : null}

      {grupos(emAberto, hoje).map((g) => {
        const total = g.contas.reduce((s, c) => s + c.valor, 0);
        return (
          <details key={g.nome} open={g.aberto} className="group mt-8">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h2 className={`font-display text-xl ${g.nome === "Vencidas" ? "text-[var(--p-vermelho)]" : ""}`}>
                {g.nome}
                <span className="ml-2 font-sans text-sm font-normal text-cafe">
                  {g.contas.length} {g.contas.length === 1 ? "conta" : "contas"}
                  <span className="group-open:hidden"> · ver</span>
                </span>
              </h2>
              <span className="shrink-0 font-semibold tabular-nums">{reais(total)}</span>
            </summary>
            <ul className="mt-3 space-y-3">
              {g.contas.map((c) => (
                <Cartao
                  key={c.id}
                  conta={c}
                  hoje={hoje}
                  copiado={copiado === c.id}
                  ocupado={ocupado}
                  aoCopiar={copiar}
                  aoPagar={abrir}
                  aoDesfazer={desfazer}
                />
              ))}
            </ul>
          </details>
        );
      })}

      <dialog
        ref={janela}
        className="p-folha"
        aria-label="Confirmar pagamento"
        onClose={() => setAberta(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget && !ocupado) e.currentTarget.close();
        }}
      >
        {aberta && codigoAberta ? (
          <form action={confirmar} className="p-folha-corpo space-y-4" key={aberta.id}>
            <div className="mx-auto h-1 w-10 rounded-full bg-linha" aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl">Confirmar pagamento</h2>
              <p className="mt-1 text-sm text-cafe">
                {aberta.titulo} · <strong className="text-tinta">{reais(aberta.valor)}</strong> · vence{" "}
                {ddmm(aberta.vencimento)}
              </p>
            </div>
            <label className="block">
              <span className="p-rotulo">Saiu de qual conta</span>
              <select name="conta" className="p-campo mt-1 w-full" defaultValue={aberta.contaId ?? contaPadrao} required>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="p-rotulo">Forma</span>
              <select
                name="forma"
                className="p-campo mt-1 w-full"
                defaultValue={formaSugerida(aberta, codigoAberta.tipo, formas) ?? 0}
              >
                <option value={0}>Não informar</option>
                {formas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="p-rotulo">Dia em que pagou</span>
              <input
                type="date"
                name="dia"
                className="p-campo mt-1 w-full"
                defaultValue={hoje}
                max={hoje}
                min={somarDias(hoje, -60)}
                required
              />
            </label>
            {erro ? (
              <p role="alert" className="p-aviso p-aviso-erro">
                {erro}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="p-btn p-btn-secundario"
                onClick={() => janela.current?.close()}
                disabled={ocupado}
              >
                Cancelar
              </button>
              <button type="submit" className="p-btn p-btn-primario" disabled={ocupado}>
                {ocupado ? "Gravando na Takeat…" : "Confirmar pagamento"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}

type PropsCartao = {
  conta: Conta;
  hoje: string;
  pagaEm?: string;
  copiado: boolean;
  ocupado: boolean;
  aoCopiar: (c: Conta, texto: string) => void;
  aoPagar: (c: Conta) => void;
  aoDesfazer: (c: Conta) => void;
};

function Cartao({ conta, hoje, pagaEm, copiado, ocupado, aoCopiar, aoPagar, aoDesfazer }: PropsCartao) {
  const codigo = lerCodigo(conta.codigo, hoje);
  const vencida = conta.vencimento < hoje;
  const diferencas = [
    codigo.valor !== null && Math.abs(codigo.valor - conta.valor) > 0.009 ? `diz ${reais(codigo.valor)}` : "",
    codigo.vencimento !== null && codigo.vencimento !== conta.vencimento ? `vence em ${ddmm(codigo.vencimento)}` : "",
  ].filter(Boolean);
  const categorias = conta.categorias.map((c) => c.nome);
  const subtitulo = conta.descricao && conta.descricao !== conta.titulo ? conta.descricao : null;

  if (pagaEm)
    return (
      <li className="p-cartao flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{conta.titulo}</p>
          <p className="text-sm text-[var(--color-verde-escuro)]">
            Pago em {ddmm(pagaEm)} · {reais(conta.valor)}
          </p>
        </div>
        <button type="button" className="p-btn p-btn-fantasma p-btn-sm" onClick={() => aoDesfazer(conta)} disabled={ocupado}>
          Desfazer
        </button>
      </li>
    );

  return (
    <li className="p-cartao p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{conta.titulo}</p>
          {subtitulo ? <p className="mt-0.5 text-sm text-cafe">{subtitulo}</p> : null}
        </div>
        <p
          className={`shrink-0 text-lg font-semibold tabular-nums ${vencida ? "text-[var(--p-vermelho)]" : ""}`}
        >
          {reais(conta.valor)}
        </p>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cafe">
        <span className={vencida ? "font-semibold text-[var(--p-vermelho)]" : ""}>
          {vencida ? "Venceu" : "Vence"} {rotuloData(conta.vencimento)}
        </span>
        {conta.forma ? <span className="p-selo">{conta.forma}</span> : null}
        {conta.nota ? <span className="p-selo">Nota {conta.nota}</span> : <span className="p-selo">Sem nota</span>}
      </p>
      {categorias.length ? (
        <p className="mt-1 text-xs text-cafe">
          {categorias[0]}
          {categorias.length > 1 ? ` e mais ${categorias.length - 1}` : ""}
        </p>
      ) : null}

      {codigo.tipo === "nenhum" ? (
        <p className="mt-3 text-sm text-cafe">
          Sem código para copiar. Quem lançou precisa colar a chave Pix ou o código do boleto em “Linha digitável”, na
          Takeat.
        </p>
      ) : (
        <div className="mt-3 rounded-[var(--p-raio-sm)] bg-creme px-3 py-2">
          <p className="text-xs font-semibold text-cafe">{ROTULO_CODIGO[codigo.tipo]}</p>
          <p className="mt-0.5 break-all font-mono text-sm">{codigo.copiar}</p>
        </div>
      )}

      {diferencas.length ? (
        <p className="p-aviso p-aviso-alerta mt-3">
          Confira antes de pagar: o código {diferencas.join(" e ")}, diferente da conta lançada.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="p-btn p-btn-primario"
          disabled={codigo.tipo === "nenhum"}
          onClick={() => aoCopiar(conta, codigo.copiar)}
        >
          {copiado ? "Copiado ✓" : codigo.tipo === "pix" || codigo.tipo === "chave" ? "Copiar Pix" : "Copiar código"}
        </button>
        <button type="button" className="p-btn p-btn-secundario" onClick={() => aoPagar(conta)} disabled={ocupado}>
          Paguei
        </button>
      </div>
      {copiado ? <p className="mt-2 text-sm text-cafe">Agora abra o app do banco e cole.</p> : null}
    </li>
  );
}
