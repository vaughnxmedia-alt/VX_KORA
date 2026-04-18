-- Mission Control: authors need read access to per-tenant RAG documents and intelligence
-- filter rows (for "Make me smarter" and tenant context) when operating on behalf of
-- customers that are not linked to their auth user (same pattern as customers + ingest).

DROP POLICY IF EXISTS "Authors can select tenant RAG docs" ON public.kora_tenant_rag_documents;
CREATE POLICY "Authors can select tenant RAG docs"
ON public.kora_tenant_rag_documents
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'author');

DROP POLICY IF EXISTS "Authors can select intelligence filters" ON public.kora_intelligence_filters;
CREATE POLICY "Authors can select intelligence filters"
ON public.kora_intelligence_filters
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'author');
