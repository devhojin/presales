-- 2026-04-22 CRITICAL: profiles self-update privilege escalation 차단
--
-- [문제]
-- 기존 "Users can update own profile" 정책이 USING: auth.uid()=id 만 지정하고
-- WITH CHECK 가 null 이어서, 로그인 유저가
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', me)
-- 로 자기 role 을 admin 으로 바꿔 권한 상승이 가능했음.
--
-- [조치]
-- 본인 프로필 update 시에도 민감 컬럼(role/email/admin_memo/login_failed_count/
-- login_locked_until) 은 기존 값과 동일해야만 통과하도록 WITH CHECK 를 강화.
-- 관리자 수정 경로는 "Admins can update all profiles" 정책으로 유지되므로 영향 없음.
-- service_role 및 로그인 잠금 API 는 RLS 우회하므로 영향 없음.

BEGIN;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (role, email, admin_memo, login_failed_count, login_locked_until)
        IS NOT DISTINCT FROM
        (
          SELECT (p.role, p.email, p.admin_memo, p.login_failed_count, p.login_locked_until)
          FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
        )
  );

COMMIT;

-- 확인:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE tablename = 'profiles' AND policyname = 'Users can update own profile';
