UPDATE profiles
SET llm_reviewer_config =
  CASE
    WHEN llm_reviewer_config IS NULL THEN
      '{"provider": "openrouter", "endpoint": null}'::jsonb
    ELSE
      llm_reviewer_config || '{"provider": "openrouter", "endpoint": null}'::jsonb
  END
WHERE llm_reviewer_config IS NULL
   OR NOT llm_reviewer_config ? 'provider';
