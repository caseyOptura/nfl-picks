-- 0006_chat_push.sql
-- Web Push delivery for league chat (PR 4). After-insert triggers on
-- chat_messages and chat_reactions POST the new row to the chat-push Edge
-- Function through pg_net. All recipient filtering happens in the function.
--
-- Needs two Vault secrets, created once by hand and never committed:
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/chat-push', 'chat_push_url');
--   select vault.create_secret('<random string>', 'chat_webhook_secret');
-- The second must match the function's CHAT_WEBHOOK_SECRET. Until both exist
-- the trigger does nothing, so chat keeps working without push configured.

create extension if not exists pg_net with schema extensions;

create or replace function public.chat_push_notify()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'chat_push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'chat_webhook_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  -- Queued now, sent by pg_net after this transaction commits.
  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('type', tg_op, 'table', tg_table_name, 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

revoke execute on function public.chat_push_notify() from public, anon, authenticated;

create trigger chat_messages_push
  after insert on public.chat_messages
  for each row execute function public.chat_push_notify();

create trigger chat_reactions_push
  after insert on public.chat_reactions
  for each row execute function public.chat_push_notify();

-- A browser has one subscription endpoint no matter who is signed in, so a
-- plain upsert would hit another user's row and fail RLS. This moves the
-- device to whoever is signed in now.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent;
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
