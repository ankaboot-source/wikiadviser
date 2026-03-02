-- Fix infinite recursion in RLS policy for profiles table
-- The EXISTS subquery that references the same table causes infinite recursion
-- when updating llm_reviewer_config (e.g., adding a prompt)

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create fixed policy without self-referencing subquery
-- auth.uid() = id already ensures users can only update their own row
CREATE POLICY "Users can update own profile."
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);
