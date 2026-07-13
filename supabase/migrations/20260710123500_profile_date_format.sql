ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'DD/MM/YYYY';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_date_format_check,
  ADD CONSTRAINT profiles_date_format_check
    CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));
