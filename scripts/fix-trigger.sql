CREATE OR REPLACE FUNCTION public.update_leads_search_vector() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $function$
BEGIN 
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.first_name, '')), 'A') || 
    setweight(to_tsvector('english', coalesce(NEW.last_name, '')), 'A') || 
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'A') || 
    setweight(to_tsvector('english', coalesce(NEW.company_name, '')), 'B') || 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'B') || 
    setweight(to_tsvector('english', (SELECT coalesce(string_agg(val, ' '), '') FROM jsonb_array_elements_text(coalesce(NEW.tags, '[]'::jsonb)) AS val)), 'B') || 
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C') || 
    setweight(to_tsvector('english', coalesce(NEW.country, '')), 'C') || 
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'C') || 
    setweight(to_tsvector('english', coalesce(NEW.mobile, '')), 'C'); 
  RETURN NEW; 
END;
$function$;
