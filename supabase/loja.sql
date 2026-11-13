-- Loja privada do painel do Nikola's (substitui o Vercel Blob, 12/11/2026).
-- Rodar uma vez no SQL Editor do projeto Supabase do Nikola's.
-- Sem políticas de acesso: só o servidor do site, com a chave secreta, lê e grava.

create table if not exists public.loja (
  caminho       text primary key,
  conteudo      text not null,
  versao        bigint not null,
  atualizado_em timestamptz not null default now()
);

alter table public.loja enable row level security;
revoke all on public.loja from anon, authenticated;

-- imagens dos posts (bucket privado)
insert into storage.buckets (id, name, public)
values ('loja', 'loja', false)
on conflict (id) do nothing;
