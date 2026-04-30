-- Tabela de etiquetas customizáveis para pets (novo, agressivo, idoso, etc.)
CREATE TABLE public.pet_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  icon TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_kind TEXT, -- 'new_pet' = sinalizador automático de pet novo, NULL = manual
  created_by UUID,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_tags_client_id ON public.pet_tags(client_id);
CREATE INDEX idx_pet_tags_expires_at ON public.pet_tags(expires_at);

ALTER TABLE public.pet_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pet_tags"
ON public.pet_tags FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated can insert pet_tags"
ON public.pet_tags FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update pet_tags"
ON public.pet_tags FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Authenticated can delete pet_tags"
ON public.pet_tags FOR DELETE
TO authenticated USING (true);

CREATE TRIGGER update_pet_tags_updated_at
BEFORE UPDATE ON public.pet_tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();