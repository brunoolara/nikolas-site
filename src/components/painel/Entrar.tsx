"use client";

// A porta do painel: usuário e senha.

import { useActionState } from "react";
import { acaoEntrar, type Resultado } from "@/lib/acessos/acoes";
import type { Area } from "@/lib/acessos/areas";

const INICIAL: Resultado = { ok: false, mensagem: "" };

type Props = {
  area: Area | "master" | "qualquer";
  titulo: string;
  subtitulo: string;
};

export default function Entrar({ area, titulo, subtitulo }: Props) {
  const [estado, enviar, enviando] = useActionState(acaoEntrar.bind(null, area), INICIAL);

  return (
    <form action={enviar} className="mx-auto mt-24 w-full max-w-sm px-6">
      <h1 className="font-display text-3xl">{titulo}</h1>
      <p className="mt-2 text-cafe">{subtitulo}</p>


      <label className="mt-8 block text-sm font-semibold" htmlFor="usuario">
        Usuário
      </label>
      <input
        id="usuario"
        name="usuario"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        required
        autoFocus
        className="mt-1 w-full rounded border border-linha bg-white px-3 py-2.5 text-lg"
      />

      <label className="mt-4 block text-sm font-semibold" htmlFor="senha">
        Senha
      </label>
      <input
        id="senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        className="mt-1 w-full rounded border border-linha bg-white px-3 py-2.5 text-lg"
      />

      {estado.mensagem ? (
        <p className="mt-3 text-sm font-medium text-red-700">{estado.mensagem}</p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="mt-5 w-full rounded bg-verde px-4 py-3 font-semibold text-papel hover:bg-verde-escuro disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
