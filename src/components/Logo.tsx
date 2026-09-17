import Image from "next/image";

// Monograma "N." com gota, desenho do Bruno (set/2026). Vetor e original em Desktop/Nikolas/Logotipo.
// "escuro" = N preto para fundos claros; "claro" = N branco para fundos escuros.
export default function Logo({
  className = "h-10 w-10",
  variante = "escuro",
}: {
  className?: string;
  variante?: "escuro" | "claro";
}) {
  return (
    <Image
      src={variante === "claro" ? "/images/logo-n-branco.png" : "/images/logo-n-preto.png"}
      alt=""
      width={512}
      height={512}
      className={`object-contain ${className}`}
    />
  );
}
