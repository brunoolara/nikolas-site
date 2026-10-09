import { redirect } from "next/navigation";
import { eMaster } from "@/lib/acessos/sessao";
import EditorPost from "../EditorPost";

export default async function NovoPost() {
  if (!(await eMaster())) redirect("/posts");
  return <EditorPost />;
}
