// Lista dos funcionários e formulário para cadastrar mais um.

import Link from "next/link";
import Sair from "@/components/painel/Sair";
import { MASTER, lerUsuarios } from "@/lib/acessos/usuarios";
import LinhaUsuario from "./LinhaUsuario";
import NovoUsuario from "./NovoUsuario";

export default async function Acessos() {
  const usuarios = (await lerUsuarios()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-4">
        <div>
          <h1 className="font-display text-3xl">Acessos</h1>
          <p className="mt-1 text-sm text-cafe">
            Você entra como <strong>{MASTER}</strong> e vê tudo.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/alterar-cardapio" className="rounded border border-linha px-3 py-2 text-sm text-cafe hover:bg-creme">
            Cardápio
          </Link>
          <Link href="/posts" className="rounded border border-linha px-3 py-2 text-sm text-cafe hover:bg-creme">
            Posts
          </Link>
          <Sair />
        </div>
      </header>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Funcionários</h2>
        <p className="text-sm text-cafe">
          As senhas não ficam guardadas de forma legível: se alguém esquecer, defina uma nova.
        </p>
        <div className="mt-3 grid gap-3">
          {usuarios.length ? (
            usuarios.map((u) => (
              <LinhaUsuario key={u.usuario} usuario={u.usuario} nome={u.nome} areas={u.areas} ativo={u.ativo} />
            ))
          ) : (
            <p className="rounded border border-dashed border-linha p-4 text-sm text-cafe">Ninguém cadastrado ainda.</p>
          )}
        </div>
      </section>

      <NovoUsuario />
    </div>
  );
}
