
ALTER TABLE public.hotel_medications ADD COLUMN IF NOT EXISTS administered_at timestamptz DEFAULT NULL;

ALTER TABLE public.hotel_stays ADD COLUMN IF NOT EXISTS belonging_labels jsonb DEFAULT '{}';
