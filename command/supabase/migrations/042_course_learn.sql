-- HAND Learn — course platform tables (first course: "Build your first app
-- with Claude Code", course_key claude-code-101).
--
-- Written exclusively through the public site's learn-api Netlify function
-- using the service role. RLS is enabled with no policies so anon/authenticated
-- roles cannot touch these rows; the service role bypasses RLS.

create table if not exists command.course_learners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  name text not null,
  email text not null,
  passcode_hash text not null,
  -- guided = walking through it with a HAND human; solo = self-serve
  mode text not null default 'solo' check (mode in ('solo', 'guided')),
  course_key text not null default 'claude-code-101',
  graduated_at timestamptz,
  notes text
);

create unique index if not exists course_learners_email_key
  on command.course_learners (lower(email));

create table if not exists command.course_progress (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references command.course_learners(id) on delete cascade,
  course_key text not null default 'claude-code-101',
  lesson_key text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'complete', 'stuck')),
  -- free-form checkpoint payload: quiz answers, checklist state, stuck note
  checkpoint jsonb,
  updated_at timestamptz not null default now(),
  unique (learner_id, course_key, lesson_key)
);

create index if not exists course_progress_learner_idx
  on command.course_progress (learner_id, updated_at desc);

-- "Pin for review later": a learner flags a section (anchor) inside a lesson,
-- optionally with a note about what felt fuzzy. resolved_at is set when the
-- learner marks it reviewed — history is kept so a coach can see what people
-- struggled with.
create table if not exists command.course_pins (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references command.course_learners(id) on delete cascade,
  course_key text not null default 'claude-code-101',
  lesson_key text not null,
  anchor text not null,
  title text,
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (learner_id, course_key, lesson_key, anchor)
);

create index if not exists course_pins_learner_idx
  on command.course_pins (learner_id, created_at desc);

-- Granular activity stream: signup, login, lesson_view, checkpoint,
-- complete, stuck, unstuck, pin, unpin, graduated. Powers the coach view's
-- "where are they / are they stuck" answers.
create table if not exists command.course_events (
  id bigint generated always as identity primary key,
  learner_id uuid references command.course_learners(id) on delete cascade,
  course_key text,
  lesson_key text,
  kind text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists course_events_learner_idx
  on command.course_events (learner_id, created_at desc);
create index if not exists course_events_kind_idx
  on command.course_events (kind, created_at desc);

alter table command.course_learners enable row level security;
alter table command.course_progress enable row level security;
alter table command.course_pins enable row level security;
alter table command.course_events enable row level security;
