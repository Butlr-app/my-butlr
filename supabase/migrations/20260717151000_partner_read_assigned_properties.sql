DROP POLICY IF EXISTS "Partners read assigned properties" ON public.properties;
CREATE POLICY "Partners read assigned properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.property_id = properties.id
      AND t.partner_id = public.my_marketplace_partner_id()
  )
);
