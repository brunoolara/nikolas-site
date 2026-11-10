// Quem está logado neste aparelho, o que pode abrir e o botão de sair.

import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecalho from "@/components/painel/Cabecalho";
import Icone from "@/components/painel/Icone";
import Sair from "@/components/painel/Sair";
import { ITENS } from "@/components/painel/Moldura";
import { sessaoAtual } from "@/lib/acessos/sessao";
import { PREFERENCIAS_PADRAO, TIPOS, lerPreferencias, type TipoAviso } from "@/lib/notificacoes/armazem";
import { chavePublica, pushConfigurado } from "@/lib/notificacoes/enviar";
import Notificacoes from "./Notificacoes";

export default async function Perfil() {
  // o layout já barra, mas o Next pode pedir só a página sem rodar o layout
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/");
  const prefs = { ...PREFERENCIAS_PADRAO, ...(await lerPreferencias())[sessao.usuario] };
  const tipos = (Object.keys(TIPOS) as TipoAviso[]).map((chave) => ({ chave, ...TIPOS[chave] }));
  const areas = ITENS.filter(
    (i) => i.chave !== "inicio" && (i.master ? sessao.master : i.area ? sessao.areas.includes(i.area) : false),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Cabecalho titulo="Perfil" descricao="Quem está usando o painel neste aparelho." />

      <section className="p-cartao mt-6 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--p-verde-fundo)] font-display text-2xl text-verde">
          {sessao.nome.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl">{sessao.nome}</p>
          <p className="text-sm text-cafe">
            Usuário <strong className="text-tinta">{sessao.usuario}</strong> ·{" "}
            {sessao.master ? "dono, vê tudo" : "funcionário"}
          </p>
        </div>
      </section>

      <section className="p-cartao mt-4 p-5">
        <h2 className="p-cartao-titulo">O que você abre</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {areas.map((a) => (
            <li key={a.chave}>
              <Link
                href={a.href}
                className="flex min-h-12 items-center gap-3 rounded-[var(--p-raio-sm)] border border-linha px-3 hover:border-verde/50"
              >
                <Icone nome={a.icone} className="h-5 w-5 text-verde" />
                <span className="font-semibold">{a.nome}</span>
              </Link>
            </li>
          ))}
        </ul>
        {!sessao.master ? (
          <p className="mt-4 text-sm text-cafe">Para abrir outra área ou trocar a senha, fale com o Bruno.</p>
        ) : null}
      </section>

      <Notificacoes
        chavePublica={chavePublica()}
        configurado={pushConfigurado()}
        podeDelivery={sessao.areas.includes("operacao")}
        tipos={tipos}
        preferencias={prefs}
      />

      <div className="mt-6">
        <Sair />
      </div>
    </div>
  );
}
