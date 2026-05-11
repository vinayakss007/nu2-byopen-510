-- Final Fixes and Missing Components
-- 1. Add enroll_count to sequences
ALTER TABLE public.sequences ADD COLUMN IF NOT EXISTS enroll_count INTEGER DEFAULT 0;

-- 2. Add deal_id to call_logs
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

-- 3. Create whatsapp_templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  language text DEFAULT 'en',
  category text,
  status text,
  components jsonb DEFAULT '[]',
  meta_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name, language)
);

-- 4. Fix potential missing leads table if still problematic (already verified but just in case for schema consistency)
-- It exists in current DB but let's ensure it has future-proofing jsonb
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='metadata') THEN
    ALTER TABLE public.leads ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;
