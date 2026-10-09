import { redirect } from "next/navigation";
import { papel } from "@/lib/menu/sessao";
import EditorPost from "../EditorPost";

export default async function NovoPost() {
  if ((await papel()) !== "dono") redirect("/posts");
  return <EditorPost />;
}
