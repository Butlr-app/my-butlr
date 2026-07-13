-- Multi-owner isolation for property creation and deletion.
DROP POLICY IF EXISTS "Owner inserts properties" ON public.properties;
CREATE POLICY "Owner inserts properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner deletes properties" ON public.properties;
CREATE POLICY "Owner deletes properties"
ON public.properties
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());
