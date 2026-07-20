-- Phase 10.1 — Per-villa document vault
-- Store villa documents (manuals, warranties, insurance, maintenance
-- contracts…). Files live in the existing public "images" bucket under a
-- documents/ prefix; this table holds the metadata + public URL.

CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('manual','warranty','contract','insurance','certificate','floorplan','other')),
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  notes       TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_property ON public.documents (property_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read documents" ON public.documents;
CREATE POLICY "Staff read documents"
  ON public.documents FOR SELECT TO authenticated
  USING (public.is_app_owner() OR public.can_access_property(property_id));

DROP POLICY IF EXISTS "Staff upload documents" ON public.documents;
CREATE POLICY "Staff upload documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.is_app_owner() OR public.can_access_property(property_id));

DROP POLICY IF EXISTS "Owners update documents" ON public.documents;
CREATE POLICY "Owners update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (public.is_app_owner() OR uploaded_by = auth.uid())
  WITH CHECK (public.is_app_owner() OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Owners delete documents" ON public.documents;
CREATE POLICY "Owners delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.is_app_owner() OR uploaded_by = auth.uid());
