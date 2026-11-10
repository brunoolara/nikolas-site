// Entrada única: sem login, pede usuário e senha; com login, mostra só as
// áreas que a pessoa pode abrir.

import Link from "next/link";
import Entrar from "@/components/painel/Entrar";
import Moldura from "@/components/painel/Moldura";
import Icone, { type NomeIcone } from "@/components/painel/Icone";
import { faltaConfigurarSenha, sessaoAtual } from "@/lib/acessos/sessao";
import type { Area } from "@/lib/acessos/areas";

type Bloco = { href: string; nome: string; descricao: string; icone: NomeIcone; area?: Area; master?: boolean };

const BLOCOS: Bloco[] = [
  {
    area: "cardapio",
    href: "/alterar-cardapio",
    nome: "Cardápio",
    icone: "cardapio",
    descricao: "Menu executivo, menu do salão e especiais de domingo: editar e imprimir.",
  },
  {
    area: "posts",
    href: "/posts",
    nome: "Posts do status",
    icone: "posts",
    descricao: "Os posts do dia para compartilhar no status do WhatsApp.",
  },
  {
    area: "caixinha",
    href: "/caixinha",
    nome: "Caixinha",
    icone: "caixinha",
    descricao: "A taxa de serviço do dia dividida com a equipe, por turno, com o consumo descontado.",
  },
  {
    area: "operacao",
    href: "/operacao",
    nome: "Ao vivo",
    icone: "operacao",
    descricao: "Mesas abertas e pedidos de delivery, com os que estão passando do tempo em destaque.",
  },
  {
    area: "estoque",
    href: "/estoque",
    nome: "Contagem de estoque",
    icone: "estoque",
    descricao: "A contagem semanal do estoque, por categoria, pelo celular ou pelo computador.",
  },
  {
    master: true,
    href: "/cmv",
    nome: "CMV",
    icone: "cmv",
    descricao: "Faturamento, custo da mercadoria e margem da semana e do mês, direto das vendas.",
  },
  {
    master: true,
    href: "/acessos",
    nome: "Acessos",
    icone: "acessos",
    descricao: "Cadastro dos funcionários, senhas e o que cada um acessa.",
  },
  {
    master: true,
    href: "/acessos/registro",
    nome: "Registro",
    icone: "registro",
    descricao: "O que cada um mudou no cardápio, e quem entrou no painel e quando.",
  },
];

function saudacao() {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(
      new Date(),
    ),
  );
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Painel() {
  if (faltaConfigurarSenha()) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="p-cartao max-w-lg p-8">
          <h1 className="font-display text-2xl">Falta configurar a senha</h1>
          <p className="mt-3 text-cafe">
            O painel só abre depois que a variável <code className="font-mono">SENHA_PAINEL</code> (a senha do
            master) existir no ambiente da Vercel.
          </p>
        </div>
      </div>
    );
  }

  const sessao = await sessaoAtual();
  if (!sessao) return <Entrar area="qualquer" titulo="Painel do Nikola's" subtitulo="Entre com seu usuário e senha." />;

  const liberados = BLOCOS.filter((b) => (b.master ? sessao.master : b.area ? sessao.areas.includes(b.area) : false));
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <Moldura atual="inicio" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <p className="text-sm font-medium text-cafe first-letter:uppercase">{hoje}</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          {saudacao()}, {sessao.nome.split(" ")[0]}.
        </h1>
        <p className="mt-1.5 text-cafe">O que você quer fazer agora?</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liberados.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="p-cartao flex flex-col p-5 transition-[border-color,box-shadow] duration-150 hover:border-verde/50 hover:shadow-[var(--p-sombra-alta)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-verde/10 text-verde">
                <Icone nome={b.icone} className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-2xl">{b.nome}</h2>
              <p className="mt-1 flex-1 text-sm text-cafe">{b.descricao}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-verde">
                Abrir
                <Icone nome="seta" className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
