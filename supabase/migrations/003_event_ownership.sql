alter table public.events
add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create index if not exists events_owner_user_id_idx on public.events(owner_user_id);

drop policy if exists "authenticated users can create events" on public.events;
drop policy if exists "event owners can update events" on public.events;
drop policy if exists "event owners can delete events" on public.events;

create policy "authenticated users can create events"
on public.events for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "event owners can update events"
on public.events for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "event owners can delete events"
on public.events for delete
to authenticated
using (owner_user_id = auth.uid());
