
ALTER TABLE public.hotel_medications ADD COLUMN recurrence text NOT NULL DEFAULT 'once';
ALTER TABLE public.hotel_stays ADD COLUMN ate boolean NOT NULL DEFAULT false;
