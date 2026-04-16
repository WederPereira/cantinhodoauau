
-- Make hotel_stay_id nullable in hotel_medications to support non-hotel dogs
ALTER TABLE public.hotel_medications ALTER COLUMN hotel_stay_id DROP NOT NULL;

-- Add client_id column to hotel_medications
ALTER TABLE public.hotel_medications ADD COLUMN client_id uuid;

-- Create taxi_groups table for fixed/saved groups
CREATE TABLE public.taxi_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.taxi_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view taxi_groups" ON public.taxi_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert taxi_groups" ON public.taxi_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update taxi_groups" ON public.taxi_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete taxi_groups" ON public.taxi_groups FOR DELETE TO authenticated USING (true);
