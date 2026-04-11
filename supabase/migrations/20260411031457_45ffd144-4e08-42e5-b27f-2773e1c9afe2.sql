ALTER TABLE public.reels_posts ALTER COLUMN media_url DROP NOT NULL;
ALTER TABLE public.reels_posts ALTER COLUMN media_url SET DEFAULT '';