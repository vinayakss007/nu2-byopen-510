ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
