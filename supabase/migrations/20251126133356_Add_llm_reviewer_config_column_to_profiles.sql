ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS llm_reviewer_config jsonb DEFAULT '{
  "prompt": null,
  "model": null,
  "has_api_key": false
}'::jsonb;