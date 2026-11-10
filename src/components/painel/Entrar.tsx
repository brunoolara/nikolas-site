"use client";

// A porta do painel: usuário e senha.

import { useActionState } from "react";
import Logo from "@/components/Logo";
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
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <form action={enviar} className="p-cartao w-full max-w-sm p-7 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-14 w-14" />
          <h1 className="mt-4 font-display text-3xl">{titulo}</h1>
          <p className="mt-1 text-sm text-cafe">{subtitulo}</p>
        </div>

        <label className="p-rotulo mt-8" htmlFor="usuario">
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
          className="p-campo text-base"
        />

        <label className="p-rotulo mt-4" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="p-campo text-base"
        />

        {estado.mensagem ? (
          <p className="p-aviso p-aviso-erro mt-4" role="alert">
            {estado.mensagem}
          </p>
        ) : null}

        <button type="submit" disabled={enviando} className="p-btn p-btn-primario mt-6 w-full min-h-11 text-base">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
