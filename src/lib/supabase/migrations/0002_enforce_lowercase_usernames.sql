-- Ensure all existing usernames are stored in lowercase and enforce this rule

-- Convert any existing usernames to lowercase
UPDATE public.cajeros
SET username = lower(username);

-- Add a check constraint to guarantee usernames are always lowercase
ALTER TABLE public.cajeros
  ADD CONSTRAINT cajeros_username_lowercase CHECK (username = lower(username));
