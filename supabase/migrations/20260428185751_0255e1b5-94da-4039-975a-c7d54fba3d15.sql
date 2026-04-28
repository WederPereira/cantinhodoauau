
-- Catálogo de planos (configurável)
CREATE TABLE public.contract_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL, -- 'mensal' | 'trimestral' | 'semestral' | 'anual'
  frequency_per_week integer NOT NULL, -- 1 a 5
  base_monthly_value numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_type, frequency_per_week)
);

ALTER TABLE public.contract_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plans" ON public.contract_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage plans" ON public.contract_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Contratos
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  client_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, -- snapshot dos dados no momento da venda
  plan_type text NOT NULL,
  frequency_per_week integer NOT NULL,
  base_monthly_value numeric(10,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'normal', -- 'normal' | 'desc15' | 'desc30' | 'custom'
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  final_monthly_value numeric(10,2) NOT NULL DEFAULT 0,
  total_contract_value numeric(10,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'pendente', -- pendente | ativo | cancelado | concluido
  payment_method text DEFAULT '',
  observations text DEFAULT '',
  missing_fields jsonb DEFAULT '[]'::jsonb, -- campos que faltam preencher
  cancelled_at timestamptz,
  cancellation_fee numeric(10,2),
  pdf_url text,
  docx_url text,
  created_by uuid,
  created_by_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contract_plans_updated_at BEFORE UPDATE ON public.contract_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- Seed inicial dos 20 planos (4 vigências x 5 frequências) com valor 0 — admin configura depois
INSERT INTO public.contract_plans (plan_type, frequency_per_week, base_monthly_value)
SELECT pt, fpw, 0
FROM (VALUES ('mensal'), ('trimestral'), ('semestral'), ('anual')) AS p(pt)
CROSS JOIN generate_series(1,5) AS fpw;
