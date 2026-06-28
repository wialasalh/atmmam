-- Allow members to view and create tickets for their linked company
create policy "members select company tickets"
  on public.tickets for select
  using (
    client_id in (
      select member_of_client_id from public.profiles
      where id = auth.uid() and member_of_client_id is not null
    )
  );

create policy "members insert company tickets"
  on public.tickets for insert
  with check (
    client_id in (
      select member_of_client_id from public.profiles
      where id = auth.uid() and member_of_client_id is not null
    )
  );
