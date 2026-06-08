-- Storage bucket for league photos
insert into storage.buckets (id, name, public)
values ('league-photos', 'league-photos', true)
on conflict (id) do nothing;

create policy "League photos publicly readable"
  on storage.objects for select using (bucket_id = 'league-photos');

create policy "League owner can upload league photo"
  on storage.objects for insert
  with check (
    bucket_id = 'league-photos'
    and public.is_league_owner(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "League owner can update league photo"
  on storage.objects for update
  using (
    bucket_id = 'league-photos'
    and public.is_league_owner(((storage.foldername(name))[1])::uuid, auth.uid())
  );
