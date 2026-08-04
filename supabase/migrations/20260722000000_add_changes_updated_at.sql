ALTER TABLE changes ADD COLUMN updated_at timestamptz DEFAULT now();
