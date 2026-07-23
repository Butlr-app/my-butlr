CREATE TABLE IF NOT EXISTS public.contract_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  source text NOT NULL CHECK (source IN ('owner_upload', 'concierge_upload', 'generated')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 15728640),
  extraction_status text NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_text text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_files_reservation_id_idx
  ON public.contract_files (reservation_id);

CREATE INDEX IF NOT EXISTS contract_files_contract_id_idx
  ON public.contract_files (contract_id);

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS analysis_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_analysis_status_check,
  ADD CONSTRAINT contracts_analysis_status_check
    CHECK (analysis_status IN ('not_required', 'pending', 'processing', 'completed', 'partial', 'failed'));

ALTER TABLE public.contract_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contract files access by reservation property" ON public.contract_files;
CREATE POLICY "Contract files access by reservation property"
ON public.contract_files
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = contract_files.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
)
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = contract_files.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-files',
  'contract-files',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload contract files" ON storage.objects;
CREATE POLICY "Users upload contract files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read accessible contract files" ON storage.objects;
CREATE POLICY "Users read accessible contract files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.contract_files file
      JOIN public.reservations reservation ON reservation.id = file.reservation_id
      WHERE file.storage_path = name
        AND public.can_access_property(reservation.property_id)
    )
  )
);

DROP POLICY IF EXISTS "Users delete accessible contract files" ON storage.objects;
CREATE POLICY "Users delete accessible contract files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.contract_files file
      JOIN public.reservations reservation ON reservation.id = file.reservation_id
      WHERE file.storage_path = name
        AND public.can_access_property(reservation.property_id)
    )
  )
);
