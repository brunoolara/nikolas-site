import { notFound, redirect } from "next/navigation";
import { papel } from "@/lib/menu/sessao";
import { lerPosts } from "@/lib/posts/armazem";
import EditorPost from "../EditorPost";

export default async function EditarPost({ params }: PageProps<"/posts/[id]">) {
  if ((await papel()) !== "dono") redirect("/posts");
  const { id } = await params;
  const post = (await lerPosts()).find((p) => p.id === id);
  if (!post) notFound();
  return <EditorPost post={post} />;
}
