-- Attach public SPA images to seeded catalogue products (run after seed.sql once).
delete from public.product_images where product_id in ('seed_prod_ebox', 'seed_prod_arm', 'seed_prod_hand');

insert into public.product_images (product_id, url, alt, sort_order, is_primary) values
  ('seed_prod_ebox', '/images/hero-product.png', 'INVI E-BOX', 0, true),
  ('seed_prod_arm', '/images/service-automation.png', '6 DOF Robotic Arm', 0, true),
  ('seed_prod_hand', '/images/process-innovate.png', 'Prosthetic Hand', 0, true);
