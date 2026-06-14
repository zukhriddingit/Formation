create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  location text,
  starts_at timestamptz,
  organizer_email text,
  premium_until timestamptz,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  linkedin_url text,
  avatar_url text,
  headline text,
  bio text,
  skills text[] default '{}',
  positions text[] default '{}',
  interests text[] default '{}',
  wants_to_build text,
  has_idea boolean default false,
  looking_for_team boolean default true,
  vibe text check (vibe in ('serious', 'chill', 'beginner-friendly', 'trying-to-win')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, user_id)
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  one_liner text not null,
  target_user text,
  roles_needed text[] default '{}',
  tags text[] default '{}',
  vibe text,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete cascade,
  idea_id uuid references public.ideas(id) on delete set null,
  name text not null,
  tagline text,
  vibe text,
  roles_needed text[] default '{}',
  max_size integer default 4,
  status text default 'forming',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text,
  created_at timestamptz default now(),
  unique(team_id, profile_id)
);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete cascade,
  message text,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  decided_at timestamptz
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  stripe_checkout_session_id text unique,
  buyer_email text,
  amount_cents integer,
  status text default 'pending',
  created_at timestamptz default now()
);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  email_type text,
  recipient text,
  status text,
  created_at timestamptz default now()
);

create index profiles_event_id_idx on public.profiles(event_id);
create index profiles_user_id_idx on public.profiles(user_id);
create index ideas_event_id_idx on public.ideas(event_id);
create index teams_event_id_idx on public.teams(event_id);
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_profile_id_idx on public.team_members(profile_id);
create index join_requests_team_id_idx on public.join_requests(team_id);
create index join_requests_requester_profile_id_idx on public.join_requests(requester_profile_id);
create index payments_event_id_idx on public.payments(event_id);
create index email_logs_team_id_idx on public.email_logs(team_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger touch_ideas_updated_at
before update on public.ideas
for each row execute function public.touch_updated_at();

create trigger touch_teams_updated_at
before update on public.teams
for each row execute function public.touch_updated_at();

alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.payments enable row level security;
alter table public.email_logs enable row level security;

create policy "authenticated users can read events"
on public.events for select
to authenticated
using (true);

create policy "authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "users can insert own profile"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "users can update own profile"
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete own profile"
on public.profiles for delete
to authenticated
using (user_id = auth.uid());

create policy "authenticated users can read ideas"
on public.ideas for select
to authenticated
using (true);

create policy "users can create ideas for own profile"
on public.ideas for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.event_id = ideas.event_id
      and p.user_id = auth.uid()
  )
);

create policy "idea owners can update ideas"
on public.ideas for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.event_id = ideas.event_id
      and p.user_id = auth.uid()
  )
);

create policy "idea owners can delete ideas"
on public.ideas for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.user_id = auth.uid()
  )
);

create policy "authenticated users can read teams"
on public.teams for select
to authenticated
using (true);

create policy "users can create teams for own profile"
on public.teams for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.event_id = teams.event_id
      and p.user_id = auth.uid()
  )
);

create policy "team owners can update teams"
on public.teams for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.event_id = teams.event_id
      and p.user_id = auth.uid()
  )
);

create policy "team owners can delete teams"
on public.teams for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.user_id = auth.uid()
  )
);

create policy "authenticated users can read team members"
on public.team_members for select
to authenticated
using (true);

create policy "team owners can insert team members"
on public.team_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = t.owner_profile_id
    where t.id = team_members.team_id
      and p.user_id = auth.uid()
  )
);

create policy "team owners can update team members"
on public.team_members for update
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = t.owner_profile_id
    where t.id = team_members.team_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = t.owner_profile_id
    where t.id = team_members.team_id
      and p.user_id = auth.uid()
  )
);

create policy "team owners can delete team members"
on public.team_members for delete
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = t.owner_profile_id
    where t.id = team_members.team_id
      and p.user_id = auth.uid()
  )
);

create policy "requesters and team owners can read join requests"
on public.join_requests for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = requester_profile_id
      and p.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.teams t
    join public.profiles owner_profile on owner_profile.id = t.owner_profile_id
    where t.id = join_requests.team_id
      and owner_profile.user_id = auth.uid()
  )
);

create policy "users can create own join requests"
on public.join_requests for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = requester_profile_id
      and p.event_id = join_requests.event_id
      and p.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.teams t
    where t.id = join_requests.team_id
      and t.event_id = join_requests.event_id
  )
);

create policy "team owners can update join requests"
on public.join_requests for update
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.profiles owner_profile on owner_profile.id = t.owner_profile_id
    where t.id = join_requests.team_id
      and owner_profile.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teams t
    join public.profiles owner_profile on owner_profile.id = t.owner_profile_id
    where t.id = join_requests.team_id
      and owner_profile.user_id = auth.uid()
  )
);

create policy "requesters can delete own join requests"
on public.join_requests for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = requester_profile_id
      and p.user_id = auth.uid()
  )
);

insert into public.events (id, slug, name, location, starts_at, organizer_email)
values (
  '11111111-1111-4111-8111-111111111111',
  'world-cup-hack',
  'World Cup Hack',
  'Innovation Arena',
  '2026-06-20 14:00:00+00',
  'organizer@formation.dev'
)
on conflict (slug) do update set
  name = excluded.name,
  location = excluded.location,
  starts_at = excluded.starts_at,
  organizer_email = excluded.organizer_email;

insert into public.profiles (
  id,
  event_id,
  name,
  email,
  linkedin_url,
  headline,
  bio,
  skills,
  positions,
  interests,
  wants_to_build,
  has_idea,
  looking_for_team,
  vibe,
  experience_level
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111111',
    'Maya Chen',
    'maya@example.com',
    'https://www.linkedin.com/in/mayachen',
    'Full-stack captain who ships polished demos',
    'Builds fast product loops with React, Supabase, and crisp demo storytelling.',
    array['React', 'Next.js', 'Supabase', 'Product'],
    array['Frontend', 'Full-stack'],
    array['AI agents', 'Civic tech', 'Developer tools'],
    'A scout that helps hackathon teams find missing positions quickly.',
    true,
    false,
    'trying-to-win',
    'advanced'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111111',
    'Jordan Patel',
    'jordan@example.com',
    null,
    'Designer who turns messy concepts into clear flows',
    'Loves service design, pitch decks, and product experiences that feel ready by Sunday.',
    array['UX', 'Figma', 'Brand', 'Pitch'],
    array['Design', 'Product'],
    array['Health', 'Education', 'Consumer apps'],
    'Tools that reduce stress for first-time hackers.',
    false,
    true,
    'beginner-friendly',
    'intermediate'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111111',
    'Sam Rivera',
    'sam@example.com',
    null,
    'ML midfielder with pragmatic model taste',
    'Turns ambiguous AI ideas into scoped workflows, evals, and working endpoints.',
    array['Python', 'OpenAI', 'Embeddings', 'Evaluation'],
    array['AI/ML', 'Backend'],
    array['Search', 'Sports tech', 'Knowledge tools'],
    'A recommendation system that explains why teammates match.',
    false,
    true,
    'serious',
    'advanced'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111111',
    'Ava Brooks',
    'ava@example.com',
    null,
    'Backend keeper for payments, auth, and reliable APIs',
    'Comfortable with Supabase, Stripe, email workflows, and security tradeoffs.',
    array['Postgres', 'Stripe', 'RLS', 'Node.js'],
    array['Backend', 'Infrastructure'],
    array['Fintech', 'Marketplaces', 'Ops tools'],
    'A product teams can actually operate after demo day.',
    false,
    true,
    'serious',
    'advanced'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111111',
    'Noah Kim',
    'noah@example.com',
    null,
    'Mobile striker who likes fast prototypes',
    'Ships mobile-first interfaces, maps, and playful interaction details.',
    array['React Native', 'Maps', 'Animations', 'TypeScript'],
    array['Mobile', 'Frontend'],
    array['Travel', 'Sports', 'Local discovery'],
    'A live city guide for fans visiting new stadiums.',
    true,
    false,
    'chill',
    'intermediate'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '11111111-1111-4111-8111-111111111111',
    'Lina Okafor',
    'lina@example.com',
    null,
    'Data winger for dashboards and decision loops',
    'Finds the signal in event data and turns it into simple, visual workflows.',
    array['Analytics', 'SQL', 'Charts', 'PostHog'],
    array['Data', 'Product'],
    array['Climate', 'Events', 'Communities'],
    'A dashboard that helps organizers keep teams balanced in real time.',
    false,
    true,
    'trying-to-win',
    'intermediate'
  )
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  linkedin_url = excluded.linkedin_url,
  headline = excluded.headline,
  bio = excluded.bio,
  skills = excluded.skills,
  positions = excluded.positions,
  interests = excluded.interests,
  wants_to_build = excluded.wants_to_build,
  has_idea = excluded.has_idea,
  looking_for_team = excluded.looking_for_team,
  vibe = excluded.vibe,
  experience_level = excluded.experience_level;

insert into public.ideas (
  id,
  event_id,
  owner_profile_id,
  title,
  one_liner,
  target_user,
  roles_needed,
  tags,
  vibe,
  status
)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    'Formation',
    'A live transfer market that helps hackers form balanced teams before momentum dies.',
    'Hackathon participants and organizers',
    array['AI/ML', 'Backend', 'Design'],
    array['AI agents', 'Marketplaces', 'Events'],
    'trying-to-win',
    'open'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222205',
    'FanTrail',
    'A mobile match-day guide that turns city exploration into a fan challenge.',
    'Traveling sports fans',
    array['Design', 'Backend', 'Data'],
    array['Sports tech', 'Travel', 'Consumer apps'],
    'chill',
    'open'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222206',
    'GreenRoom Ops',
    'A lightweight command center for organizers balancing volunteers, rooms, and teams.',
    'Hackathon organizers',
    array['Frontend', 'Backend', 'Product'],
    array['Ops tools', 'Events', 'Analytics'],
    'serious',
    'open'
  )
on conflict (id) do update set
  title = excluded.title,
  one_liner = excluded.one_liner,
  target_user = excluded.target_user,
  roles_needed = excluded.roles_needed,
  tags = excluded.tags,
  vibe = excluded.vibe,
  status = excluded.status;

insert into public.teams (
  id,
  event_id,
  owner_profile_id,
  idea_id,
  name,
  tagline,
  vibe,
  roles_needed,
  max_size,
  status
)
values
  (
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    '33333333-3333-4333-8333-333333333301',
    'Formation FC',
    'The transfer desk for balanced hackathon squads.',
    'trying-to-win',
    array['AI/ML', 'Backend', 'Design'],
    4,
    'forming'
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222205',
    '33333333-3333-4333-8333-333333333302',
    'FanTrail United',
    'City discovery for match-day supporters.',
    'chill',
    array['Design', 'Backend', 'Data'],
    4,
    'forming'
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222206',
    '33333333-3333-4333-8333-333333333303',
    'GreenRoom City',
    'Organizer visibility from kickoff to judging.',
    'serious',
    array['Frontend', 'Backend', 'Product'],
    4,
    'forming'
  )
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  vibe = excluded.vibe,
  roles_needed = excluded.roles_needed,
  max_size = excluded.max_size,
  status = excluded.status;

insert into public.team_members (id, team_id, profile_id, role)
values
  (
    '55555555-5555-4555-8555-555555555501',
    '44444444-4444-4444-8444-444444444401',
    '22222222-2222-4222-8222-222222222201',
    'Captain / Full-stack'
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '44444444-4444-4444-8444-444444444401',
    '22222222-2222-4222-8222-222222222204',
    'Backend'
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '44444444-4444-4444-8444-444444444402',
    '22222222-2222-4222-8222-222222222205',
    'Captain / Mobile'
  ),
  (
    '55555555-5555-4555-8555-555555555504',
    '44444444-4444-4444-8444-444444444403',
    '22222222-2222-4222-8222-222222222206',
    'Captain / Data'
  )
on conflict (team_id, profile_id) do update set
  role = excluded.role;
