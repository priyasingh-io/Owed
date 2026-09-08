-- Trigger function to automatically create a profile record when a new user signs up in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, reminder_lead_days)
  values (
    new.id,
    coalesce(new.email, ''),
    '{30,7,1}'
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

-- Trigger to execute after insert on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
