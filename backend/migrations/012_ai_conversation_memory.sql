-- 012_ai_conversation_memory.sql
--
-- Ignisha AI previously had NO server-side memory. Conversation history lived
-- only in the browser (localStorage for the dashboard, in-memory React state for
-- the floating widget), and the backend /ignition/chat endpoint was fully
-- stateless — it trusted whatever `conversationHistory` the client posted. That
-- meant: refreshing the page, closing the widget, switching device/browser, or
-- clearing the cache wiped all memory, and the model only ever saw whatever
-- fragment the client happened to send.
--
-- This migration adds a durable, per-conversation memory store so Ignisha can
-- retain context across reloads and devices, with a rolling AI-generated summary
-- of older turns to stay within the model's token window on long chats.
--
-- Conventions matched to the rest of this schema:
--   * user_id is `text` (the app's users.id is text, and sibling tables such as
--     saved_items store user_id as a plain text column with no FK).
--   * RLS is DISABLED — auth is custom JWT and the backend uses the service-role
--     key, exactly like every other table in supabase_schema.sql.
--   * Named `ai_conversations` (not `conversations`, which already exists for the
--     messaging feature).

-- 1) One row per chat thread, owned by a user. `summary` holds the rolling
--    AI-generated digest of messages older than the verbatim recent window;
--    `summarized_count` tracks how many of the oldest messages are already
--    folded into that summary so we only re-summarize when enough new turns age
--    out of the recent window.
create table if not exists public.ai_conversations (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    title text not null default 'New chat',
    summary text not null default '',
    summarized_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2) Individual turns. role is constrained to the values the chat models accept.
--    Messages cascade-delete with their parent thread.
create table if not exists public.ai_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamptz not null default now()
);

-- 3) Indexes for the two hot access paths: list a user's conversations
--    (newest first) and load a conversation's messages in order.
create index if not exists idx_ai_conversations_user
    on public.ai_conversations (user_id, updated_at desc);
create index if not exists idx_ai_messages_conversation
    on public.ai_messages (conversation_id, created_at asc);

-- 4) Match the project-wide convention of leaving RLS off (service-role backend).
alter table public.ai_conversations disable row level security;
alter table public.ai_messages disable row level security;
