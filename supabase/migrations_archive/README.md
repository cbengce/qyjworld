# Archived migrations

Files below this directory are retained unchanged for audit history. They are
not part of the deployable Supabase migration chain and must not be passed to
`supabase db push` or copied back into `supabase/migrations` without a new owner
review.

- `not-deployed/`: work that was never approved for Production.
- `deferred/`: deliberately postponed functionality.
- `superseded/`: historical SQL replaced by the canonical current state.

The current ASCEND descendant of archived migrations 0019 and 0021 is defined
by `supabase/migrations/0027_ascend_canonical_runtime.sql`.
