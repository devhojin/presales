-- 2026-04-19: RLS auth_rls_initplan 60건 일괄 래핑 (Supabase 공식 권장 패턴)
-- DROP+CREATE 트랜잭션. 실패시 BEGIN/COMMIT으로 안전. 적용 후 advisor 재집계로 검증.

BEGIN;

-- announcement_bookmarks.Users manage own announcement bookmarks (ALL)
DROP POLICY IF EXISTS "Users manage own announcement bookmarks" ON public.announcement_bookmarks;
CREATE POLICY "Users manage own announcement bookmarks" ON public.announcement_bookmarks TO public
  USING ((( select auth.uid() ) = user_id));

-- announcement_logs.Admin can view announcement_logs (ALL)
DROP POLICY IF EXISTS "Admin can view announcement_logs" ON public.announcement_logs;
CREATE POLICY "Admin can view announcement_logs" ON public.announcement_logs TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- announcement_reads.Users manage own announcement reads (ALL)
DROP POLICY IF EXISTS "Users manage own announcement reads" ON public.announcement_reads;
CREATE POLICY "Users manage own announcement reads" ON public.announcement_reads TO public
  USING ((( select auth.uid() ) = user_id));

-- announcements.Admin can manage all announcements (ALL)
DROP POLICY IF EXISTS "Admin can manage all announcements" ON public.announcements;
CREATE POLICY "Admin can manage all announcements" ON public.announcements TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- blocked_announcements.Admin can manage blocked_announcements (ALL)
DROP POLICY IF EXISTS "Admin can manage blocked_announcements" ON public.blocked_announcements;
CREATE POLICY "Admin can manage blocked_announcements" ON public.blocked_announcements TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- blocked_community_posts.Admin can manage blocked_community_posts (ALL)
DROP POLICY IF EXISTS "Admin can manage blocked_community_posts" ON public.blocked_community_posts;
CREATE POLICY "Admin can manage blocked_community_posts" ON public.blocked_community_posts TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- blog_posts.Admins can manage all posts (ALL)
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
CREATE POLICY "Admins can manage all posts" ON public.blog_posts TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- brief_items.brief_items_admin_all (ALL)
DROP POLICY IF EXISTS "brief_items_admin_all" ON public.brief_items;
CREATE POLICY "brief_items_admin_all" ON public.brief_items TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- brief_subscribers.brief_subscribers_admin_all (ALL)
DROP POLICY IF EXISTS "brief_subscribers_admin_all" ON public.brief_subscribers;
CREATE POLICY "brief_subscribers_admin_all" ON public.brief_subscribers TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- cart_items.Users can manage own cart (ALL)
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart" ON public.cart_items TO public
  USING ((( select auth.uid() ) = user_id));

-- categories.Admin can manage categories (ALL)
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
CREATE POLICY "Admin can manage categories" ON public.categories TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- chat_messages.Admins manage all messages (ALL)
DROP POLICY IF EXISTS "Admins manage all messages" ON public.chat_messages;
CREATE POLICY "Admins manage all messages" ON public.chat_messages TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- chat_messages.Room participants see messages (SELECT)
DROP POLICY IF EXISTS "Room participants see messages" ON public.chat_messages;
CREATE POLICY "Room participants see messages" ON public.chat_messages FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM chat_rooms
  WHERE ((chat_rooms.id = chat_messages.room_id) AND ((chat_rooms.user_id = ( select auth.uid() )) OR (EXISTS ( SELECT 1
           FROM profiles
          WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))))))));

-- chat_payment_requests.Admins manage payment requests (ALL)
DROP POLICY IF EXISTS "Admins manage payment requests" ON public.chat_payment_requests;
CREATE POLICY "Admins manage payment requests" ON public.chat_payment_requests TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- chat_payment_requests.Users see own payment requests (SELECT)
DROP POLICY IF EXISTS "Users see own payment requests" ON public.chat_payment_requests;
CREATE POLICY "Users see own payment requests" ON public.chat_payment_requests FOR SELECT TO public
  USING ((( select auth.uid() ) = user_id));

-- chat_rooms.Admins manage all rooms (ALL)
DROP POLICY IF EXISTS "Admins manage all rooms" ON public.chat_rooms;
CREATE POLICY "Admins manage all rooms" ON public.chat_rooms TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- chat_rooms.Members see own rooms (SELECT)
DROP POLICY IF EXISTS "Members see own rooms" ON public.chat_rooms;
CREATE POLICY "Members see own rooms" ON public.chat_rooms FOR SELECT TO public
  USING ((( select auth.uid() ) = user_id));

-- community_posts.Admin can manage all posts (ALL)
DROP POLICY IF EXISTS "Admin can manage all posts" ON public.community_posts;
CREATE POLICY "Admin can manage all posts" ON public.community_posts TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- community_posts.Users can view their bookmarked feeds (SELECT)
DROP POLICY IF EXISTS "Users can view their bookmarked feeds" ON public.community_posts;
CREATE POLICY "Users can view their bookmarked feeds" ON public.community_posts FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM feed_bookmarks
  WHERE ((feed_bookmarks.post_id = community_posts.id) AND (feed_bookmarks.user_id = ( select auth.uid() ))))));

-- consulting_packages.Admin can manage packages (ALL)
DROP POLICY IF EXISTS "Admin can manage packages" ON public.consulting_packages;
CREATE POLICY "Admin can manage packages" ON public.consulting_packages TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- consulting_requests.Admin can manage consulting requests (ALL)
DROP POLICY IF EXISTS "Admin can manage consulting requests" ON public.consulting_requests;
CREATE POLICY "Admin can manage consulting requests" ON public.consulting_requests TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- consulting_requests.Authenticated users can create consulting request (INSERT)
DROP POLICY IF EXISTS "Authenticated users can create consulting request" ON public.consulting_requests;
CREATE POLICY "Authenticated users can create consulting request" ON public.consulting_requests FOR INSERT TO public
  WITH CHECK ((( select auth.uid() ) IS NOT NULL));

-- consulting_requests.Users can view own requests (SELECT)
DROP POLICY IF EXISTS "Users can view own requests" ON public.consulting_requests;
CREATE POLICY "Users can view own requests" ON public.consulting_requests FOR SELECT TO public
  USING ((( select auth.uid() ) = user_id));

-- coupon_uses.Admin full access on coupon_uses (ALL)
DROP POLICY IF EXISTS "Admin full access on coupon_uses" ON public.coupon_uses;
CREATE POLICY "Admin full access on coupon_uses" ON public.coupon_uses TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- coupon_uses.Users view own coupon uses (SELECT)
DROP POLICY IF EXISTS "Users view own coupon uses" ON public.coupon_uses;
CREATE POLICY "Users view own coupon uses" ON public.coupon_uses FOR SELECT TO public
  USING ((user_id = ( select auth.uid() )));

-- daily_briefs.brief_admin_all (ALL)
DROP POLICY IF EXISTS "brief_admin_all" ON public.daily_briefs;
CREATE POLICY "brief_admin_all" ON public.daily_briefs TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- download_logs.Admin can view all download logs (SELECT)
DROP POLICY IF EXISTS "Admin can view all download logs" ON public.download_logs;
CREATE POLICY "Admin can view all download logs" ON public.download_logs FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- download_logs.Users can insert own downloads (INSERT)
DROP POLICY IF EXISTS "Users can insert own downloads" ON public.download_logs;
CREATE POLICY "Users can insert own downloads" ON public.download_logs FOR INSERT TO public
  WITH CHECK ((( select auth.uid() ) = user_id));

-- download_logs.Users can view own download logs (SELECT)
DROP POLICY IF EXISTS "Users can view own download logs" ON public.download_logs;
CREATE POLICY "Users can view own download logs" ON public.download_logs FOR SELECT TO public
  USING ((( select auth.uid() ) = user_id));

-- download_logs.Users can view own downloads (SELECT)
DROP POLICY IF EXISTS "Users can view own downloads" ON public.download_logs;
CREATE POLICY "Users can view own downloads" ON public.download_logs FOR SELECT TO public
  USING ((( select auth.uid() ) = user_id));

-- feed_bookmarks.Users manage own feed bookmarks (ALL)
DROP POLICY IF EXISTS "Users manage own feed bookmarks" ON public.feed_bookmarks;
CREATE POLICY "Users manage own feed bookmarks" ON public.feed_bookmarks TO public
  USING ((( select auth.uid() ) = user_id));

-- feed_logs.Admin can view feed_logs (ALL)
DROP POLICY IF EXISTS "Admin can view feed_logs" ON public.feed_logs;
CREATE POLICY "Admin can view feed_logs" ON public.feed_logs TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- feed_reads.Users manage own feed reads (ALL)
DROP POLICY IF EXISTS "Users manage own feed reads" ON public.feed_reads;
CREATE POLICY "Users manage own feed reads" ON public.feed_reads TO public
  USING ((( select auth.uid() ) = user_id));

-- feed_sources.Admin can manage feed_sources (ALL)
DROP POLICY IF EXISTS "Admin can manage feed_sources" ON public.feed_sources;
CREATE POLICY "Admin can manage feed_sources" ON public.feed_sources TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- order_items.Admin can view all order items (SELECT)
DROP POLICY IF EXISTS "Admin can view all order items" ON public.order_items;
CREATE POLICY "Admin can view all order items" ON public.order_items FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- order_items.Users can create order items (INSERT)
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = ( select auth.uid() ))))));

-- order_items.Users can view own order items (SELECT)
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = ( select auth.uid() ))))));

-- orders.Admin can update orders (UPDATE)
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
CREATE POLICY "Admin can update orders" ON public.orders FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- orders.Admin can view all orders (SELECT)
DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
CREATE POLICY "Admin can view all orders" ON public.orders FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- orders.Users can create orders (INSERT)
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO public
  WITH CHECK ((( select auth.uid() ) = user_id));

-- orders.Users can view own orders (SELECT)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO public
  USING ((( select auth.uid() ) = user_id));

-- page_views.Admins can view page views (SELECT)
DROP POLICY IF EXISTS "Admins can view page views" ON public.page_views;
CREATE POLICY "Admins can view page views" ON public.page_views FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- product_discount_matches.Admins can manage all discount matches (ALL)
DROP POLICY IF EXISTS "Admins can manage all discount matches" ON public.product_discount_matches;
CREATE POLICY "Admins can manage all discount matches" ON public.product_discount_matches TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- product_files.Admin can manage product files (ALL)
DROP POLICY IF EXISTS "Admin can manage product files" ON public.product_files;
CREATE POLICY "Admin can manage product files" ON public.product_files TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- product_files.Buyers can view purchased files (SELECT)
DROP POLICY IF EXISTS "Buyers can view purchased files" ON public.product_files;
CREATE POLICY "Buyers can view purchased files" ON public.product_files FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.product_id = product_files.product_id) AND (o.user_id = ( select auth.uid() )) AND (o.status = 'paid'::text)))));

-- product_files.Users can view free product files (SELECT)
DROP POLICY IF EXISTS "Users can view free product files" ON public.product_files;
CREATE POLICY "Users can view free product files" ON public.product_files FOR SELECT TO public
  USING (((( select auth.uid() ) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = product_files.product_id) AND (products.is_free = true))))));

-- products.Admin can do anything with products (ALL)
DROP POLICY IF EXISTS "Admin can do anything with products" ON public.products;
CREATE POLICY "Admin can do anything with products" ON public.products TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- profiles.Admin can view all profiles (SELECT)
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT TO public
  USING (((( select auth.uid() ) = id) OR is_admin()));

-- profiles.Users can update own profile (UPDATE)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO public
  USING ((( select auth.uid() ) = id));

-- profiles.Users can view own profile (SELECT)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO public
  USING ((( select auth.uid() ) = id));

-- review_helpful.Users can remove helpful (DELETE)
DROP POLICY IF EXISTS "Users can remove helpful" ON public.review_helpful;
CREATE POLICY "Users can remove helpful" ON public.review_helpful FOR DELETE TO public
  USING ((( select auth.uid() ) = user_id));

-- review_helpful.Users can toggle helpful (INSERT)
DROP POLICY IF EXISTS "Users can toggle helpful" ON public.review_helpful;
CREATE POLICY "Users can toggle helpful" ON public.review_helpful FOR INSERT TO public
  WITH CHECK ((( select auth.uid() ) = user_id));

-- reviews.Admin can manage reviews (ALL)
DROP POLICY IF EXISTS "Admin can manage reviews" ON public.reviews;
CREATE POLICY "Admin can manage reviews" ON public.reviews TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- reviews.Users can create own reviews (INSERT)
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
CREATE POLICY "Users can create own reviews" ON public.reviews FOR INSERT TO public
  WITH CHECK ((( select auth.uid() ) = user_id));

-- reviews.Users can delete own reviews (DELETE)
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO public
  USING ((( select auth.uid() ) = user_id));

-- reviews.Users can update own reviews (UPDATE)
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO public
  USING ((( select auth.uid() ) = user_id));

-- site_settings.Admin can manage settings (ALL)
DROP POLICY IF EXISTS "Admin can manage settings" ON public.site_settings;
CREATE POLICY "Admin can manage settings" ON public.site_settings TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- team_members.Admin can manage team (ALL)
DROP POLICY IF EXISTS "Admin can manage team" ON public.team_members;
CREATE POLICY "Admin can manage team" ON public.team_members TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- user_coupons.Admin full access (ALL)
DROP POLICY IF EXISTS "Admin full access" ON public.user_coupons;
CREATE POLICY "Admin full access" ON public.user_coupons TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( select auth.uid() )) AND (profiles.role = 'admin'::text)))));

-- user_coupons.Users view own coupons (SELECT)
DROP POLICY IF EXISTS "Users view own coupons" ON public.user_coupons;
CREATE POLICY "Users view own coupons" ON public.user_coupons FOR SELECT TO public
  USING ((user_id = ( select auth.uid() )));

COMMIT;