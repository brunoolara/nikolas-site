// Entrada única: sem login, pede usuário e senha; com login, mostra só as
// áreas que a pessoa pode abrir. Desde 26/11/2026, como app de banco: o verde
// do cabeçalho desce numa faixa com a saudação, e por cima da borda dela fica
// um cartão com os atalhos em ícones (nome curto embaixo; a descrição vai no
// title, para quem passa o mouse).

import Link from "next/link";
import Entrar from "@/components/painel/Entrar";
import Moldura, { podeVer } from "@/components/painel/Moldura";
import Icone, { type NomeIcone } from "@/components/painel/Icone";
import { faltaConfigurarSenha, sessaoAtual } from "@/lib/acessos/sessao";
import { contarNovos } from "@/lib/avisos";
import type { Area } from "@/lib/acessos/areas";

type Bloco = { href: string; nome: string; descricao: string; icone: NomeIcone; area?: Area; master?: boolean; gestor?: boolean };

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
    nome: "Posts",
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
    area: "caixinha-turno",
    href: "/caixinha-turno",
    nome: "Turno",
    icone: "caixinha",
    descricao: "Para o PC do restaurante: marcar quem trabalhou no turno de agora e fechar e pagar.",
  },
  {
    area: "minha-caixinha",
    href: "/minha-caixinha",
    nome: "Minha caixinha",
    icone: "caixinha",
    descricao: "Os turnos em que você trabalhou, a sua parte da taxa, o seu consumo e os pagamentos.",
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
    nome: "Estoque",
    icone: "estoque",
    descricao: "A contagem semanal do estoque, por categoria, pelo celular ou pelo computador.",
  },
  {
    area: "contas",
    href: "/contas",
    nome: "Contas",
    icone: "contas",
    descricao: "O que vence hoje e nos próximos dias, o código para pagar e o “Paguei”, direto da Takeat.",
  },
  {
    gestor: true,
    href: "/caixa",
    nome: "Caixa",
    icone: "caixa",
    descricao: "Cada caixa fechado na Takeat: formas de pagamento, sangrias e o dinheiro a entregar.",
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

  const liberados = BLOCOS.filter((b) => podeVer(b, sessao, false));
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  const novos = await contarNovos(sessao);

  return (
    <>
      <Moldura atual="inicio" />
      <section className="bg-verde text-papel">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-3 sm:pb-20 sm:pt-8">
          <p className="text-[13px] text-papel/70 first-letter:uppercase">{hoje}</p>
          <h1 className="mt-0.5 font-display text-[28px] leading-tight sm:text-4xl">
            {saudacao()}, {sessao.nome.split(" ")[0]}.
          </h1>
          {novos ? (
            <Link
              href="/avisos"
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-verde-escuro px-3.5 text-sm font-semibold hover:bg-black/20"
            >
              <span className="h-2 w-2 rounded-full bg-chope" aria-hidden="true" />
              {novos === 1 ? "1 aviso novo" : `${novos} avisos novos`}
              <Icone nome="seta" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-8">
        <nav
          aria-label="Áreas do painel"
          className="-mt-11 rounded-[22px] border border-linha/70 bg-white px-2 py-4 shadow-[var(--p-sombra-alta)] sm:-mt-12 sm:px-5 sm:py-6"
        >
          <ul className="grid grid-cols-4 gap-y-4 sm:grid-cols-6">
            {liberados.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  title={b.descricao}
                  className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center active:bg-creme/70"
                >
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-creme text-verde transition-colors duration-150 group-hover:bg-verde group-hover:text-papel sm:h-14 sm:w-14">
                    <Icone nome={b.icone} className="h-6 w-6" />
                  </span>
                  <span className="text-[12px] font-semibold leading-tight text-tinta sm:text-[13px]">{b.nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
