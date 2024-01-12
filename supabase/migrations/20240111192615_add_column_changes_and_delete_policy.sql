-- Add new column to track if a change is hidden or not.
ALTER TABLE changes
    ADD COLUMN "hidden" BOOLEAN DEFAULT FALSE;

-- Drop the policy that allows deletion of unindexed changes.
DROP POLICY delete_unindexed_changes_policy ON changes;