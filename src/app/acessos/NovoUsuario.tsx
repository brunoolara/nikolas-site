"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Resultado } from "@/lib/acessos/acoes";
import { AREAS, ROTULO_AREA } from "@/lib/acessos/areas";
import { acaoCriarUsuario } from "./acoes";

const INICIAL: Resultado = { ok: false, mensagem: "" };
const campo = "mt-1 w-full rounded border border-linha bg-white px-3 py-2.5";

export default function NovoUsuario() {
  const [estado, enviar, enviando] = useActionState(acaoCriarUsuario, INICIAL);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} action={enviar} className="mt-10 rounded border border-linha p-5">
      <h2 className="font-display text-2xl">Cadastrar funcionário</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Nome
          <input name="nome" required placeholder="Ex.: Maria" className={campo} />
        </label>
        <label className="block text-sm font-semibold">
          Usuário <span className="font-normal text-cafe">(para entrar)</span>
          <input
            name="usuario"
            required
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Ex.: maria"
            className={campo}
          />
        </label>
        <label className="block text-sm font-semibold">
          Senha
          <input name="senha" required minLength={6} autoComplete="new-password" className={campo} />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Pode entrar em</legend>
        {AREAS.map((area) => (
          <label key={area} className="mt-2 flex items-center gap-2">
            <input type="checkbox" name="areas" value={area} defaultChecked={area === "posts"} />
            {ROTULO_AREA[area]}
          </label>
        ))}
      </fieldset>

      {estado.mensagem ? (
        <p className={`mt-4 text-sm font-medium ${estado.ok ? "text-verde" : "text-red-700"}`}>{estado.mensagem}</p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="mt-5 rounded bg-verde px-5 py-3 font-semibold text-papel hover:bg-verde-escuro disabled:opacity-60"
      >
        {enviando ? "Cadastrando…" : "Cadastrar"}
      </button>
    </form>
  );
}
