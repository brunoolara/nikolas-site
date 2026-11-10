"use client";

// A contagem, feita para o celular: categorias em abas, busca, grupos que
// abrem e fecham com o andamento de cada um, e um campo por item que grava
// sozinho ao sair dele. Enter pula para o próximo item. Para somar várias
// pesagens do mesmo item, digite "2+1,5" ou toque no "+".

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CATEGORIAS,
  lerQuantidade,
  mostrarQuantidade,
  type Categoria,
  type ItemContagem,
} from "@/lib/estoque/categorias";
import { acaoFechar, acaoLancar, acaoReabrir } from "./acoes";

type Props = {
  semana: string;
  itens: ItemContagem[];
  valores: Record<string, number>;
  fechada: boolean;
  master: boolean;
};

type Estado = "salvando" | "salvo" | "erro";

export default function Contagem({ semana, itens, valores: iniciais, fechada, master }: Props) {
  const [valores, setValores] = useState<Record<string, number>>(iniciais);
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(iniciais).map(([id, v]) => [id, mostrarQuantidade(v)])),
  );
  const [estado, setEstado] = useState<Record<string, Estado>>({});
  const [filtro, setFiltro] = useState<Categoria | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const [aviso, setAviso] = useState("");
  const [ocupado, iniciar] = useTransition();
  const campos = useRef(new Map<number, HTMLInputElement>());

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter(
      (i) => (filtro === "todas" || i.categoria === filtro) && (!termo || i.nome.toLowerCase().includes(termo)),
    );
  }, [itens, filtro, busca]);

  const grupos = CATEGORIAS.map((c) => ({ categoria: c, itens: visiveis.filter((i) => i.categoria === c) })).filter(
    (g) => g.itens.length,
  );
  const ordem = grupos.flatMap((g) => (fechados[g.categoria] ? [] : g.itens.map((i) => i.id)));
  const contados = itens.filter((i) => valores[i.id] !== undefined).length;
  const porCategoria = (c: Categoria) => {
    const lista = itens.filter((i) => i.categoria === c);
    return { total: lista.length, feitos: lista.filter((i) => valores[i.id] !== undefined).length };
  };

  function salvar(id: number) {
    const texto = textos[id] ?? "";
    const qtd = lerQuantidade(texto);
    if (Number.isNaN(qtd)) {
      setEstado((e) => ({ ...e, [id]: "erro" }));
      return;
    }
    const anterior = valores[id];
    if ((qtd ?? undefined) === anterior) {
      setTextos((t) => ({ ...t, [id]: mostrarQuantidade(qtd) }));
      return;
    }
    setEstado((e) => ({ ...e, [id]: "salvando" }));
    setTextos((t) => ({ ...t, [id]: mostrarQuantidade(qtd) }));
    void acaoLancar(semana, id, qtd).then((r) => {
      if (r.ok) {
        setValores((v) => {
          const novo = { ...v };
          if (qtd === null) delete novo[id];
          else novo[id] = qtd;
          return novo;
        });
        setEstado((e) => ({ ...e, [id]: "salvo" }));
      } else {
        setEstado((e) => ({ ...e, [id]: "erro" }));
        setAviso(r.mensagem);
      }
    });
  }

  function proximo(id: number) {
    const i = ordem.indexOf(id);
    const seguinte = i >= 0 ? ordem[i + 1] : undefined;
    if (seguinte !== undefined) campos.current.get(seguinte)?.focus();
    else campos.current.get(id)?.blur();
  }

  function somar(id: number) {
    setTextos((t) => ({ ...t, [id]: `${t[id] ?? ""}${t[id] ? "+" : ""}` }));
    setTimeout(() => campos.current.get(id)?.focus(), 0);
  }

  function fechar() {
    const faltam = itens.length - contados;
    const texto = faltam
      ? `Ainda faltam ${faltam} itens sem contagem. Fechar assim mesmo? Itens sem número ficam como não contados.`
      : "Fechar a contagem da semana? Depois de fechada, só o Bruno reabre.";
    if (!window.confirm(texto)) return;
    iniciar(async () => setAviso((await acaoFechar(semana)).mensagem));
  }

  function reabrir() {
    if (!window.confirm("Reabrir a contagem para corrigir?")) return;
    iniciar(async () => setAviso((await acaoReabrir(semana)).mensagem));
  }

  return (
    <div className="pb-28">
      <div className="p-cartao mt-6 p-4">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold">
            {contados} de {itens.length} itens contados
          </span>
          <span className="text-cafe">{itens.length ? Math.round((contados / itens.length) * 100) : 0}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-creme">
          <div
            className="h-full rounded-full bg-verde transition-[width]"
            style={{ width: `${itens.length ? (contados / itens.length) * 100 : 0}%` }}
          />
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar item…"
          className="p-campo mt-4"
          aria-label="Buscar item"
        />
        <div className="p-rolagem -mx-1 mt-3 flex gap-1.5 px-1">
          {(["todas", ...CATEGORIAS] as const).map((c) => {
            if (c !== "todas" && !porCategoria(c).total) return null;
            const ativo = filtro === c;
            const n = c === "todas" ? null : porCategoria(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFiltro(c)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  ativo ? "border-verde bg-verde text-papel" : "border-linha bg-white text-cafe hover:border-verde"
                }`}
              >
                {c === "todas" ? "Todas" : c}
                {n ? <span className="ml-1 opacity-75">{`${n.feitos}/${n.total}`}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {fechada ? (
        <p className="p-aviso p-aviso-ok mt-4">Contagem fechada. Os números abaixo são só para consulta.</p>
      ) : null}

      {grupos.map((g) => {
        const n = porCategoria(g.categoria);
        const aberto = !fechados[g.categoria];
        return (
          <section key={g.categoria} className="p-cartao mt-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setFechados((f) => ({ ...f, [g.categoria]: aberto }))}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={aberto}
            >
              <span className="font-display text-xl">{g.categoria}</span>
              <span className="flex items-center gap-2 text-sm text-cafe">
                <span className={`p-selo ${n.feitos === n.total ? "p-selo-verde" : ""}`}>
                  {n.feitos}/{n.total}
                </span>
                <span aria-hidden className={`transition-transform ${aberto ? "rotate-90" : ""}`}>
                  ›
                </span>
              </span>
            </button>
            {aberto ? (
              <ul className="divide-y divide-linha/70 border-t border-linha/70">
                {g.itens.map((i) => {
                  const st = estado[i.id];
                  return (
                    <li key={i.id} className="flex items-center gap-2 px-4 py-2">
                      <label htmlFor={`q-${i.id}`} className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-medium">{i.nome}</span>
                        <span className="text-xs text-cafe">
                          {i.unidade || "un"}
                          {st === "salvando" ? " · salvando…" : st === "salvo" ? " · salvo" : ""}
                          {st === "erro" ? <span className="text-[var(--p-vermelho)]"> · número inválido</span> : null}
                        </span>
                      </label>
                      <input
                        id={`q-${i.id}`}
                        ref={(el) => {
                          if (el) campos.current.set(i.id, el);
                          else campos.current.delete(i.id);
                        }}
                        inputMode="decimal"
                        enterKeyHint="next"
                        autoComplete="off"
                        disabled={fechada}
                        value={textos[i.id] ?? ""}
                        onChange={(e) => setTextos((t) => ({ ...t, [i.id]: e.target.value }))}
                        onBlur={() => salvar(i.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            salvar(i.id);
                            proximo(i.id);
                          }
                        }}
                        placeholder="—"
                        className={`p-campo w-28 text-right text-base tabular-nums ${
                          valores[i.id] !== undefined ? "border-verde/50 bg-[var(--p-verde-fundo)]" : ""
                        } ${st === "erro" ? "border-[var(--p-vermelho)]" : ""}`}
                      />
                      {fechada ? null : (
                        <button
                          type="button"
                          onClick={() => somar(i.id)}
                          className="p-btn p-btn-secundario h-10 w-10 p-0 text-lg"
                          title="Somar outra pesagem"
                          aria-label={`Somar outra pesagem de ${i.nome}`}
                        >
                          +
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}

      {!grupos.length ? (
        <p className="mt-6 rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">
          Nenhum item encontrado.
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-papel/95 shadow-[0_-4px_16px_rgb(27_23_16/0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          {fechada ? (
            master ? (
              <button type="button" disabled={ocupado} onClick={reabrir} className="p-btn p-btn-secundario">
                Reabrir a contagem
              </button>
            ) : (
              <span className="text-sm text-cafe">Contagem fechada.</span>
            )
          ) : (
            <button type="button" disabled={ocupado} onClick={fechar} className="p-btn p-btn-primario min-w-40">
              {ocupado ? "Fechando…" : "Fechar a contagem"}
            </button>
          )}
          <span className="text-sm text-cafe">Cada número grava sozinho ao sair do campo.</span>
          {aviso ? <span className="w-full text-sm font-medium">{aviso}</span> : null}
        </div>
      </div>
    </div>
  );
}
