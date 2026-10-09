// Quem entrou, mas não tem acesso à área que abriu.

import Link from "next/link";
import Sair from "./Sair";

export default function SemAcesso({ nome }: { nome: string }) {
  return (
    <div className="mx-auto mt-24 max-w-sm px-6">
      <h1 className="font-display text-3xl">Sem acesso</h1>
      <p className="mt-3 text-cafe">
        Você entrou como <strong>{nome}</strong>, que não tem acesso a esta área. Peça ao Bruno para liberar,
        ou entre com outro usuário.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded bg-verde px-4 py-2 text-sm font-semibold text-papel hover:bg-verde-escuro">
          Voltar ao painel
        </Link>
        <Sair />
      </div>
    </div>
  );
}
