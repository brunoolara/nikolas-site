"use client";

// Cadastrar, trocar ou tirar uma chave Pix da caixinha. Serve ao Perfil (a
// própria pessoa) e à Equipe (quem cuida da Caixinha, para quem não tem
// login). A chave é conferida aqui, para o erro aparecer na hora, e de novo
// no servidor antes de gravar.

import { useState, useTransition } from "react";
import { conferirChavePix, ROTULO_PIX, TIPOS_PIX, type TipoChavePix } from "@/lib/caixinha/pix";

type Resposta = { ok: boolean; mensagem: string };

const EXEMPLO: Record<TipoChavePix, string> = {
  cpf: "000.000.000-00",
  celular: "(35) 99999-9999",
  email: "nome@email.com",
  aleatoria: "0000aaaa-00aa-00aa-00aa-000000aaaaaa",
  cnpj: "00.000.000/0000-00",
};
const TECLADO: Record<TipoChavePix, "numeric" | "tel" | "email" | "text"> = {
  cpf: "numeric",
  celular: "tel",
  email: "email",
  aleatoria: "text",
  cnpj: "numeric",
};

export default function EditorPix({
  atual,
  acao,
  compacto = false,
}: {
  /** A chave já cadastrada, pronta para mostrar. */
  atual: { rotulo: string; mostrar: string } | null;
  acao: (tipo: string | null, chave: string) => Promise<Resposta>;
  /** Na lista da Equipe: uma linha só, o formulário abre ao tocar. */
  compacto?: boolean;
}) {
  const [aberto, setAberto] = useState(!compacto && !atual);
  const [tipo, setTipo] = useState<TipoChavePix>("cpf");
  const [chave, setChave] = useState("");
  const [aviso, setAviso] = useState<Resposta | null>(null);
  const [ocupado, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const r = conferirChavePix(tipo, chave);
    if (!r.ok) return setAviso({ ok: false, mensagem: r.erro });
    iniciar(async () => {
      const resposta = await acao(tipo, chave);
      setAviso(resposta);
      if (resposta.ok) {
        setChave("");
        setAberto(false);
      }
    });
  }

  function tirar() {
    if (!window.confirm("Tirar a chave Pix? Quem paga a caixinha deixa de ver a chave.")) return;
    iniciar(async () => setAviso(await acao(null, "")));
  }

  return (
    <div className={compacto ? "w-full text-sm" : "mt-4"}>
      {!aberto ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={atual ? "" : "text-cafe"}>
            {atual ? (
              <>
                <span className="text-cafe">{compacto ? "Pix: " : ""}{atual.rotulo} · </span>
                <span className="font-medium">{atual.mostrar}</span>
              </>
            ) : (
              "Sem chave Pix cadastrada."
            )}
          </span>
          <span className="flex gap-1">
            <button type="button" disabled={ocupado} onClick={() => setAberto(true)} className="p-btn p-btn-fantasma p-btn-sm">
              {atual ? "Trocar" : "Cadastrar chave Pix"}
            </button>
            {atual ? (
              <button type="button" disabled={ocupado} onClick={tirar} className="p-btn p-btn-fantasma p-btn-sm">
                Tirar
              </button>
            ) : null}
          </span>
        </div>
      ) : (
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <label>
            <span className="p-rotulo">Tipo da chave</span>
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoChavePix);
                setAviso(null);
              }}
              className="p-campo sm:w-auto"
            >
              {TIPOS_PIX.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_PIX[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="p-rotulo">Chave</span>
            <input
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              inputMode={TECLADO[tipo]}
              type={tipo === "email" ? "email" : "text"}
              autoComplete="off"
              placeholder={EXEMPLO[tipo]}
              className="p-campo"
            />
          </label>
          <span className="flex gap-2">
            <button type="submit" disabled={ocupado} className="p-btn p-btn-primario flex-1 sm:flex-none">
              {ocupado ? "Salvando…" : "Salvar"}
            </button>
            {atual || compacto ? (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  setAberto(false);
                  setAviso(null);
                }}
                className="p-btn p-btn-fantasma"
              >
                Cancelar
              </button>
            ) : null}
          </span>
        </form>
      )}
      {aviso ? (
        <p className={`mt-2 text-sm ${aviso.ok ? "text-verde" : "text-[var(--p-vermelho)]"}`} role="status">
          {aviso.mensagem}
        </p>
      ) : null}
    </div>
  );
}
