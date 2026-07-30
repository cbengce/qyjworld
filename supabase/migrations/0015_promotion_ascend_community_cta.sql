alter table public.promotions
  add column if not exists show_ascend_community_cta boolean not null default false;
