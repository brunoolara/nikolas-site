"use client";

// Porta de cada área interna: usuário e senha. Se já há alguém nesta máquina
// sem acesso à área, avisa quem é e oferece sair, em vez de só pedir senha.

import { useActionState } from "react";
import { acaoEntrar, acaoSair, type Resultado } from "@/lib/acessos/acoes";
import type { Area } from "@/lib/acessos/areas";

const INICIAL: Resultado = { ok: false, mensagem: "" };

type Props = {
  area: Area | "master";
  titulo: string;
  subtitulo: string;
  /** Nome de quem já entrou nesta máquina, mas não tem acesso a esta área. */
  logadoComo?: string;
};

export default function Entrar({ area, titulo, subtitulo, logadoComo }: Props) {
  const [estado, enviar, enviando] = useActionState(acaoEntrar.bind(null, area), INICIAL);

  return (
    <form action={enviar} className="mx-auto mt-24 w-full max-w-sm px-6">
      <h1 className="font-display text-3xl">{titulo}</h1>
      <p className="mt-2 text-cafe">{subtitulo}</p>

      {logadoComo ? (
        <p className="mt-4 rounded border border-linha bg-creme p-3 text-sm">
          Você está como <strong>{logadoComo}</strong>, que não tem acesso a esta área.{" "}
          <button type="button" onClick={() => acaoSair()} className="text-verde underline">
            Sair
          </button>
        </p>
      ) : null}

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
