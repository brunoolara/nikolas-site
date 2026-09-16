import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";

type Props = {
  src: string; // caminho dentro de /public, ex.: "/images/hero.jpg"
  alt: string;
  className?: string; // controla proporção e cantos do contêiner
  sizes?: string;
  priority?: boolean;
};

// Enquanto as fotos não estão em /public/images, mostra um bloco liso no lugar
// (com o nome do arquivo esperado) em vez de uma imagem quebrada. Some sozinho
// quando o arquivo é adicionado.
export default function Foto({ src, alt, className = "", sizes = "100vw", priority }: Props) {
  const existe = existsSync(join(process.cwd(), "public", src));

  if (!existe) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden bg-verde text-papel/70 ${className}`}
      >
        <span className="absolute inset-x-3 bottom-3 text-xs leading-tight">
          Foto: {src.replace("/images/", "")}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
