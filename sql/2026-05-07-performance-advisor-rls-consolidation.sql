-- Supabase Performance Advisor follow-up: consolidate duplicate permissive RLS policies.
--
-- Scope:
--   - Fixes multiple_permissive_policies by reducing public permissive policies to
--     one policy per table/action.
--   - Preserves existing access logic by snapshotting current pg_policies and
--     OR-combining the original USING / WITH CHECK expressions.
--   - Does not drop unused indexes or change Supabase Auth connection settings.

BEGIN;

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'announcements',
    'blog_posts',
    'brief_items',
    'brief_subscribers',
    'categories',
    'chat_messages',
    'chat_payment_requests',
    'chat_rooms',
    'community_posts',
    'consulting_packages',
    'consulting_requests',
    'coupon_uses',
    'coupons',
    'daily_briefs',
    'download_logs',
    'faq_categories',
    'faqs',
    'order_items',
    'orders',
    'product_discount_matches',
    'product_files',
    'products',
    'profiles',
    'reviews',
    'reward_point_ledger',
    'site_settings',
    'team_members',
    'user_coupons'
  ];
  table_name text;
  action_name text;
  policy_name text;
  using_expr text;
  check_expr text;
  source_policy record;
BEGIN
  PERFORM set_config('search_path', 'public, private, auth, pg_catalog', true);

  CREATE TEMP TABLE presales_rls_policy_snapshot ON COMMIT DROP AS
  SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY (target_tables)
    AND roles::text = '{public}'
    AND permissive = 'PERMISSIVE';

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (target_tables)
      AND roles::text = '{public}'
      AND permissive <> 'PERMISSIVE'
  ) THEN
    RAISE EXCEPTION 'Unexpected non-permissive public RLS policy in target tables';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM presales_rls_policy_snapshot) THEN
    RAISE EXCEPTION 'No target public permissive RLS policies found';
  END IF;

  FOR source_policy IN
    SELECT tablename, policyname
    FROM presales_rls_policy_snapshot
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      source_policy.policyname,
      source_policy.tablename
    );
  END LOOP;

  FOR table_name IN
    SELECT DISTINCT tablename
    FROM presales_rls_policy_snapshot
    ORDER BY tablename
  LOOP
    FOREACH action_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    LOOP
      policy_name := format('presales_rls_%s_%s', table_name, lower(action_name));

      SELECT string_agg(format('(%s)', qual), E'\nOR ' ORDER BY policyname)
      INTO using_expr
      FROM presales_rls_policy_snapshot
      WHERE tablename = table_name
        AND cmd IN (action_name, 'ALL')
        AND qual IS NOT NULL
        AND action_name IN ('SELECT', 'UPDATE', 'DELETE');

      SELECT string_agg(format('(%s)', COALESCE(with_check, qual)), E'\nOR ' ORDER BY policyname)
      INTO check_expr
      FROM presales_rls_policy_snapshot
      WHERE tablename = table_name
        AND cmd IN (action_name, 'ALL')
        AND COALESCE(with_check, qual) IS NOT NULL
        AND action_name IN ('INSERT', 'UPDATE');

      IF action_name = 'SELECT' AND using_expr IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO public USING (%s)',
          policy_name,
          table_name,
          using_expr
        );
      ELSIF action_name = 'INSERT' AND check_expr IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR INSERT TO public WITH CHECK (%s)',
          policy_name,
          table_name,
          check_expr
        );
      ELSIF action_name = 'UPDATE' AND using_expr IS NOT NULL AND check_expr IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (%s) WITH CHECK (%s)',
          policy_name,
          table_name,
          using_expr,
          check_expr
        );
      ELSIF action_name = 'UPDATE' AND using_expr IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (%s)',
          policy_name,
          table_name,
          using_expr
        );
      ELSIF action_name = 'DELETE' AND using_expr IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR DELETE TO public USING (%s)',
          policy_name,
          table_name,
          using_expr
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

COMMIT;
