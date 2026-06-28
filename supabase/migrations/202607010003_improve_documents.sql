-- Improve documents system: add category and description

alter table public.client_documents add column if not exists category text default 'general';
alter table public.client_documents add column if not exists description text;

-- Add index for category filtering
create index if not exists client_documents_category_idx on public.client_documents(category);
