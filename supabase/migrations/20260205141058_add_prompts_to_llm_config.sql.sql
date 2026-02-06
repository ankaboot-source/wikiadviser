UPDATE profiles
SET llm_reviewer_config = 
  CASE 
    WHEN llm_reviewer_config IS NULL THEN 
      '{"prompts": [], "selected_prompt_id": null}'::jsonb
    ELSE 
      llm_reviewer_config || '{"prompts": [], "selected_prompt_id": null}'::jsonb
  END
WHERE llm_reviewer_config IS NULL 
   OR NOT llm_reviewer_config ? 'prompts';