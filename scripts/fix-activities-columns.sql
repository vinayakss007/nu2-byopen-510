-- Migration to add missing columns to activities table
-- Fixes compatibility with legacy code that expects entity_type, entity_id, action columns

-- Add missing columns
ALTER TABLE IF EXISTS public.activities 
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS action text;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);

-- For existing data, backfill based on contact_id/deal_id
-- If contact_id is set, it's a contact-related activity
UPDATE public.activities 
  SET entity_type = 'contact', 
      entity_id = contact_id,
      action = type
  WHERE contact_id IS NOT NULL AND entity_type IS NULL;

-- If deal_id is set, it's a deal-related activity
UPDATE public.activities 
  SET entity_type = 'deal', 
      entity_id = deal_id,
      action = type
  WHERE deal_id IS NOT NULL AND entity_type IS NULL AND contact_id IS NULL;

-- For activities without contact_id or deal_id, set as generic
UPDATE public.activities 
  SET entity_type = 'other', 
      entity_id = id,
      action = type
  WHERE entity_type IS NULL;
