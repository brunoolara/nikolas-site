// Quem entrou, mas não tem acesso à área que abriu.

import Link from "next/link";
import Logo from "@/components/Logo";
import Sair from "./Sair";

export default function SemAcesso({ nome }: { nome: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="p-cartao w-full max-w-sm p-7 text-center sm:p-8">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-4 font-display text-3xl">Sem acesso</h1>
        <p className="mt-3 text-sm text-cafe">
          Você entrou como <strong className="text-tinta">{nome}</strong>, que não tem acesso a esta área. Peça ao
          Bruno para liberar, ou entre com outro usuário.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="p-btn p-btn-primario">
            Voltar ao painel
          </Link>
          <Sair />
        </div>
      </div>
    </div>
  );
}
