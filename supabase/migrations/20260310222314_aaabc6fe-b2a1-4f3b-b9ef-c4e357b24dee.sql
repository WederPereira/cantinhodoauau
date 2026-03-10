CREATE TABLE public.qr_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor TEXT NOT NULL,
  dog TEXT NOT NULL,
  raca TEXT NOT NULL DEFAULT '',
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public table, no auth required for this use case
ALTER TABLE public.qr_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to qr_entries" ON public.qr_entries
  FOR ALL USING (true) WITH CHECK (true);