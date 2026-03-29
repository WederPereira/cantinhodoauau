
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_name TEXT NOT NULL DEFAULT '',
  tutor_phone TEXT NOT NULL DEFAULT '',
  tutor_email TEXT NOT NULL DEFAULT '',
  tutor_address TEXT NOT NULL DEFAULT '',
  tutor_neighborhood TEXT NOT NULL DEFAULT '',
  tutor_cpf TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  breed TEXT NOT NULL DEFAULT '',
  pet_size TEXT,
  weight NUMERIC,
  birth_date TIMESTAMPTZ,
  photo TEXT,
  gender TEXT,
  castrated BOOLEAN NOT NULL DEFAULT false,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  vaccines JSONB NOT NULL DEFAULT '{"gripe":null,"v10":null,"raiva":null,"giardia":null,"antipulgas":null}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create vaccine_records table
CREATE TABLE public.vaccine_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create flea_records table
CREATE TABLE public.flea_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  brand TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flea_records ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can CRUD on clients
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: vaccine_records
CREATE POLICY "Authenticated can view vaccine_records" ON public.vaccine_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vaccine_records" ON public.vaccine_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update vaccine_records" ON public.vaccine_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete vaccine_records" ON public.vaccine_records FOR DELETE TO authenticated USING (true);

-- RLS: flea_records
CREATE POLICY "Authenticated can view flea_records" ON public.flea_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert flea_records" ON public.flea_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update flea_records" ON public.flea_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete flea_records" ON public.flea_records FOR DELETE TO authenticated USING (true);

-- Enable realtime for clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;

-- Tighten RLS on existing tables (replace "Allow all" with authenticated-only)
DROP POLICY IF EXISTS "Allow all access to hotel_stays" ON public.hotel_stays;
CREATE POLICY "Authenticated access hotel_stays" ON public.hotel_stays FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to hotel_meals" ON public.hotel_meals;
CREATE POLICY "Authenticated access hotel_meals" ON public.hotel_meals FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to hotel_medications" ON public.hotel_medications;
CREATE POLICY "Authenticated access hotel_medications" ON public.hotel_medications FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to qr_entries" ON public.qr_entries;
CREATE POLICY "Authenticated access qr_entries" ON public.qr_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to daily_records" ON public.daily_records;
CREATE POLICY "Authenticated access daily_records" ON public.daily_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
