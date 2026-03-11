CREATE TABLE public.daily_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_entry_id uuid REFERENCES public.qr_entries(id) ON DELETE CASCADE NOT NULL,
  dog text NOT NULL,
  tutor text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  ate boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(qr_entry_id, date)
);

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to daily_records" ON public.daily_records
  FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_records;