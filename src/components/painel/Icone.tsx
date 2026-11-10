// Ícones de traço do painel, desenhados aqui (sem biblioteca) e herdando a cor
// do texto. Só os que o painel usa.

export type NomeIcone =
  | "inicio"
  | "cardapio"
  | "posts"
  | "caixinha"
  | "acessos"
  | "registro"
  | "imprimir"
  | "seta"
  | "voltar"
  | "mais"
  | "equipe"
  | "calendario";

const TRACOS: Record<NomeIcone, React.ReactNode> = {
  inicio: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  cardapio: (
    <>
      <path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3Z" />
      <path d="M5 18a3 3 0 0 1 3-3h11" />
      <path d="M9 7h6M9 10.5h4" />
    </>
  ),
  posts: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.8" />
      <path d="m21 15-4.5-4.5L6 21" />
    </>
  ),
  caixinha: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 11v5M9.5 13.5h5" />
    </>
  ),
  acessos: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" />
    </>
  ),
  registro: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  imprimir: (
    <>
      <path d="M7 8V3h10v5" />
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  seta: <path d="M9 5l7 7-7 7" />,
  voltar: <path d="M15 5l-7 7 7 7" />,
  mais: <path d="M12 5v14M5 12h14" />,
  equipe: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M2.5 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 7.5-3.4" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
};

export default function Icone({ nome, className = "h-5 w-5" }: { nome: NomeIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {TRACOS[nome]}
    </svg>
  );
}
