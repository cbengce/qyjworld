alter table public.promotions
  add column if not exists image_display_mode text not null default 'auto';

alter table public.promotions
  drop constraint if exists promotions_image_display_mode_check;

alter table public.promotions
  add constraint promotions_image_display_mode_check
  check (image_display_mode in ('auto', 'portrait', 'landscape'));
