import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24 text-center">
      <h1 className="font-display text-5xl md:text-6xl">Essa página não existe</h1>
      <p className="mt-4 text-lg text-cafe">O endereço pode ter mudado. O cardápio e os contatos continuam aqui.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-verde text-papel px-6 py-3 font-semibold hover:bg-verde-escuro">
          Página inicial
        </Link>
        <Link href="/cardapio" className="rounded-full border-2 border-tinta px-6 py-3 font-semibold hover:bg-tinta hover:text-papel">
          Cardápio
        </Link>
      </div>
    </section>
  );
}
