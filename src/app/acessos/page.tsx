// Logins do painel, separados em gestores e funcionários, e o formulário para cadastrar mais um.

import Link from "next/link";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import { MASTER, lerUsuarios } from "@/lib/acessos/usuarios";
import LinhaUsuario from "./LinhaUsuario";
import NovoUsuario from "./NovoUsuario";
import { exigir } from "@/lib/acessos/sessao";
import { lerEquipe } from "@/lib/caixinha/armazem";

export default async function Acessos() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  if (!(await exigir("master")).liberado) return null;
  const [todos, time] = await Promise.all([lerUsuarios(), lerEquipe()]);
  const usuarios = todos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  // para ligar o login a alguém da equipe da Caixinha (Minha caixinha)
  const equipe = time
    .filter((p) => p.ativo || usuarios.some((u) => u.pessoa === p.id))
    .map((p) => ({ id: p.id, nome: p.nome, login: usuarios.find((u) => u.pessoa === p.id)?.usuario ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const lista = (grupo: typeof usuarios) =>
    grupo.map((u) => (
      <LinhaUsuario
        key={u.usuario}
        usuario={u.usuario}
        nome={u.nome}
        areas={u.areas}
        ativo={u.ativo}
        pessoa={u.pessoa ?? ""}
        gestor={Boolean(u.gestor)}
        equipe={equipe}
      />
    ));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho
        titulo="Acessos"
        descricao={
          <>
            Quem entra no painel e o que cada um pode abrir. Você entra como <strong className="text-tinta">{MASTER}</strong> e vê
            tudo.
          </>
        }
        acoes={
          <Link href="/acessos/registro" className="p-btn p-btn-secundario">
            <Icone nome="registro" className="h-4 w-4" />
            Registro
          </Link>
        }
      />

      <p className="mt-6 text-sm text-cafe">
        As senhas não ficam guardadas de forma legível: se alguém esquecer, defina uma nova.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-2xl">Gestores</h2>
        <div className="mt-3 grid gap-3">
          <article className="p-cartao p-4">
            <h3 className="font-semibold">
              Bruno <span className="font-normal text-cafe">· {MASTER}</span>
            </h3>
            <p className="mt-1 text-sm text-cafe">Master: vê tudo. Usuário e senha ficam na Vercel, não aqui.</p>
          </article>
          {lista(usuarios.filter((u) => u.gestor))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Funcionários</h2>
        <div className="mt-3 grid gap-3">
          {usuarios.some((u) => !u.gestor) ? (
            lista(usuarios.filter((u) => !u.gestor))
          ) : (
            <p className="rounded-[var(--p-raio)] border border-dashed border-linha bg-white/60 p-6 text-center text-sm text-cafe">Ninguém cadastrado ainda.</p>
          )}
        </div>
      </section>

      <NovoUsuario equipe={equipe} />
    </div>
  );
}
