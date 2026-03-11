CREATE TABLE public.hotel_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  dog_name text NOT NULL,
  tutor_name text NOT NULL,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  observations text DEFAULT '',
  belongings_photos text[] DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to hotel_stays" ON public.hotel_stays
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.hotel_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_stay_id uuid REFERENCES public.hotel_stays(id) ON DELETE CASCADE NOT NULL,
  medication_name text NOT NULL,
  scheduled_time time NOT NULL,
  administered boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to hotel_medications" ON public.hotel_medications
  FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_stays;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_medications;

INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-belongings', 'hotel-belongings', true);

CREATE POLICY "Allow public upload to hotel-belongings" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'hotel-belongings');

CREATE POLICY "Allow public read hotel-belongings" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'hotel-belongings');

CREATE POLICY "Allow public delete hotel-belongings" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'hotel-belongings');