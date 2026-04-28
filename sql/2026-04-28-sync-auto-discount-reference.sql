-- Keep the admin reference amount for automatic discount matches aligned with
-- the current source product catalog price.
--
-- Runtime checkout does not rely on product_discount_matches.discount_amount
-- for auto matches. It recalculates the discount from the buyer's paid source
-- order history. This value is an admin reference only, so syncing it prevents
-- the management table from showing stale numbers after product price edits.

update public.product_discount_matches pdm
   set discount_amount = p.price,
       updated_at = now()
  from public.products p
 where pdm.source_product_id = p.id
   and pdm.discount_type = 'auto'
   and pdm.discount_amount is distinct from p.price;
