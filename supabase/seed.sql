-- Optional catalogue seed only. Does NOT create customers, orders, or admin credentials.
-- Apply after migrations, e.g. via Supabase SQL editor or `supabase db reset` (local only).

insert into public.store_settings (id, json)
values (
  'default',
  '{"storeName":"INVIHUB Shop","email":"invihub@gmail.com","phone":"7022149521","shippingCharge":100,"freeShippingThreshold":5000,"taxRate":18,"estimatedDeliveryDaysMin":5,"estimatedDeliveryDaysMax":10,"maintenance":false}'
)
on conflict (id) do update set json = excluded.json;

insert into public.categories (id, name, slug, description, sort_order, image_url, status)
values
  ('seed_cat_electronics', 'Electronics', 'electronics', 'Electronic products and systems developed by INVIHUB.', 1, '/images/work-electronics.png', 'ACTIVE'),
  ('seed_cat_robotics', 'Robotics', 'robotics', 'Robotic kits and motion systems.', 2, '/images/service-automation.png', 'ACTIVE'),
  ('seed_cat_edu', 'Educational Kits', 'educational-kits', 'Hands-on kits for learning and prototyping.', 3, '/images/process-innovate.png', 'ACTIVE'),
  ('seed_cat_eng', 'Engineering Products', 'engineering-products', 'Engineered products built for real-world use.', 4, '/images/hero-product.png', 'ACTIVE')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  image_url = excluded.image_url,
  status = excluded.status;

insert into public.products (
  id, name, slug, sku, category_id, short_description, description,
  features_json, tags_json, payment_methods_json, price, mrp, stock,
  is_featured, is_new, is_best_seller, status
)
values
(
  'seed_prod_ebox',
  'INVI E-BOX',
  'invi-e-box',
  'INV-EB-001',
  (select id from public.categories where slug = 'engineering-products' limit 1),
  'Extension box with increased capacity and surge-safe utility for up to 15 two-pin plugs.',
  'The INVI E-BOX is a compact, patent-approved junction box designed for high-density plug access with surge protection for everyday devices.',
  '["Increased capacity","Efficient design","Multiple configurations","Compact construction"]',
  '["ebox","power","engineering"]',
  '["RAZORPAY","UPI","COD","BANK"]',
  2499, 2999, 25, true, true, true, 'ACTIVE'
),
(
  'seed_prod_arm',
  '6 DOF Robotic Arm',
  '6-dof-robotic-arm',
  'INV-RA-006',
  (select id from public.categories where slug = 'robotics' limit 1),
  'Education DIY robotic arm kit with 6 degrees of freedom.',
  'A six-axis educational robotic arm kit for learning kinematics, control, and mechatronics assembly.',
  '["6 degrees of freedom","DIY assembly","Education ready"]',
  '["robotic","arm","diy","kit"]',
  '["RAZORPAY","UPI","COD","BANK"]',
  8999, 9999, 8, true, true, false, 'ACTIVE'
),
(
  'seed_prod_hand',
  'Prosthetic Hand',
  'prosthetic-hand',
  'INV-PH-001',
  (select id from public.categories where slug = 'educational-kits' limit 1),
  'Educational DIY kit that can be interfaced with a microcontroller to control all five fingers individually.',
  'A five-finger prosthetic hand trainer kit for microcontroller-based actuation and sensing experiments.',
  '["Individual finger control","Microcontroller ready","Educational kit"]',
  '["prosthetic","hand","education"]',
  '["RAZORPAY","UPI","COD","BANK"]',
  6499, 7499, 3, true, false, false, 'ACTIVE'
)
on conflict (slug) do update set
  name = excluded.name,
  sku = excluded.sku,
  category_id = excluded.category_id,
  short_description = excluded.short_description,
  description = excluded.description,
  features_json = excluded.features_json,
  tags_json = excluded.tags_json,
  payment_methods_json = excluded.payment_methods_json,
  price = excluded.price,
  mrp = excluded.mrp,
  stock = excluded.stock,
  is_featured = excluded.is_featured,
  is_new = excluded.is_new,
  is_best_seller = excluded.is_best_seller,
  status = excluded.status;

delete from public.product_specifications where product_id in ('seed_prod_ebox', 'seed_prod_arm', 'seed_prod_hand');

insert into public.product_specifications (product_id, name, value, sort_order) values
  ('seed_prod_ebox', 'Material', 'ABS', 0),
  ('seed_prod_ebox', 'Input', '230V', 1),
  ('seed_prod_ebox', 'Plug capacity', 'Up to 15 × 2-pin', 2),
  ('seed_prod_ebox', 'Dimensions', 'Compact stackable', 3),
  ('seed_prod_arm', 'Axes', '6 DOF', 0),
  ('seed_prod_arm', 'Use', 'Education / DIY', 1),
  ('seed_prod_hand', 'Fingers', '5', 0),
  ('seed_prod_hand', 'Interface', 'Microcontroller', 1);

-- Catalogue images from existing public assets (same paths the Vite SPA serves)
delete from public.product_images where product_id in ('seed_prod_ebox', 'seed_prod_arm', 'seed_prod_hand');

insert into public.product_images (product_id, url, alt, sort_order, is_primary) values
  ('seed_prod_ebox', '/images/hero-product.png', 'INVI E-BOX', 0, true),
  ('seed_prod_arm', '/images/service-automation.png', '6 DOF Robotic Arm', 0, true),
  ('seed_prod_hand', '/images/process-innovate.png', 'Prosthetic Hand', 0, true);
