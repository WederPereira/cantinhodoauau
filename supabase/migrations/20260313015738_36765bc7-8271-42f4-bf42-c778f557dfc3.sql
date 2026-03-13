
CREATE TABLE public.hotel_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_stay_id uuid NOT NULL REFERENCES public.hotel_stays(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  ate boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_stay_id, date, meal_type)
);

ALTER TABLE public.hotel_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to hotel_meals" ON public.hotel_meals FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.hotel_stays ADD COLUMN expected_checkout timestamptz;

ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_meals;
