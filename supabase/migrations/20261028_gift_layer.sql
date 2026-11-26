-- The gift layer.
--
-- A bouquet row already holds the recipe: a config string that is the whole bouquet.
-- What a *gift* adds is everything the recipe cannot carry because it is not numbers:
-- photographs, a recorded voice, a video, a chosen register, a PIN, and a way for the
-- sender to come back and manage what they sent.
--
-- All of it is additive and nullable. The existing rows in this table stay valid, and a
-- gift with no media behaves exactly like the bouquets the garden has always held.

alter table public.flora_bouquets
  -- the four generative registers, and 'silence'. Not a file: a way of voicing the score
  add column if not exists register text not null default 'glass',
  -- optional four-to-six digit PIN. Stored only as a salted scrypt hash — never the PIN
  add column if not exists pin_hash text,
  -- the sender's only credential. A random token, stored only as a sha-256 hash, handed
  -- to the creator once at creation so they can edit or delete without an account
  add column if not exists owner_hash text,
  -- up to five photographs and one voice note, in a private bucket
  add column if not exists photos jsonb not null default '[]'::jsonb,
  add column if not exists voice jsonb,
  -- one video, by provider and id. We never host it, and never proxy it
  add column if not exists video jsonb,
  -- a greeting shown above the letter, on the envelope card
  add column if not exists recipient text,
  -- which paper the sender chose; the recipient opens the same envelope
  add column if not exists envelope text not null default 'classic',
  -- 'draft' until the sender creates the link; a draft is never listed in the garden
  add column if not exists status text not null default 'sealed',
  -- how many times the PIN has been refused, so a four-digit code is not free to guess
  add column if not exists attempts integer not null default 0;

-- the garden lists only what was meant to be public
create index if not exists flora_bouquets_public_idx
  on public.flora_bouquets (created_at desc)
  where status = 'sealed' and pin_hash is null;

-- media lookups go by owner, not by scanning
create index if not exists flora_bouquets_owner_idx
  on public.flora_bouquets (owner_hash)
  where owner_hash is not null;

-- The media bucket. Private: nothing in it is readable without a signed URL, which the
-- app only issues after it has checked the PIN. Five megabytes per file is generous for a
-- photograph and stingy enough that a voice note stays a voice note.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flora-gifts',
  'flora-gifts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;
