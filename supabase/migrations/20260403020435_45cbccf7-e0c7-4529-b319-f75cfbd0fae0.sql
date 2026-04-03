
CREATE TABLE public.feces_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  month_year text NOT NULL,
  collected boolean NOT NULL DEFAULT false,
  collected_at timestamp with time zone,
  collected_by uuid,
  collected_by_name text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feces_collections ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX feces_collections_client_month ON public.feces_collections (client_id, month_year);

CREATE POLICY "Authenticated can view feces_collections" ON public.feces_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert feces_collections" ON public.feces_collections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update feces_collections" ON public.feces_collections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete feces_collections" ON public.feces_collections FOR DELETE TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.feces_collections;
