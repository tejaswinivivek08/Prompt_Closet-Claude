-- Prompt Closet Demo Data Seed Script
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- STEP 1: Find your user ID
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;
--
-- STEP 2: Copy your user ID and update the SET statement below
-- Then run this entire script

-- Set your user ID here (replace 'YOUR_USER_ID_HERE' with actual UUID)
DO $$
DECLARE
  target_user_id UUID := 'YOUR_USER_ID_HERE'::UUID;
BEGIN
  -- Validate UUID format
  IF target_user_id = 'YOUR_USER_ID_HERE'::UUID THEN
    RAISE WARNING 'Please update target_user_id with your actual user ID from auth.users';
  END IF;

  -- Ensure profiles row exists
  INSERT INTO profiles (id, full_name, created_at, updated_at)
  VALUES (target_user_id, 'Demo User', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Delete any existing wardrobe items for this user (for clean re-seed)
  DELETE FROM wardrobe_items WHERE user_id = target_user_id;

  -- Insert 18 demo clothing items
  INSERT INTO wardrobe_items (user_id, image_url, category, subcategory, colors, pattern, fabric, occasions, formality_score, season, suggested_name, style_notes, is_active, created_at) VALUES

  (target_user_id, 'https://picsum.photos/seed/navy-kurta/600/800', 'top', 'kurta', '{"#000080"}', 'embroidered', 'cotton', '{"festive","casual","formal"}', 4, '{"summer","fall"}', 'Navy Embroidered Cotton Kurta', 'Elegant navy kurta with delicate chikankari embroidery. Versatile for both festive occasions and formal gatherings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/red-saree/600/800', 'traditional', 'saree', '{"#FF0000","#FFD700"}', 'embroidered', 'silk', '{"wedding","festive","formal"}', 5, '{"all-season"}', 'Red Silk Embroidered Saree', 'Luxurious silk saree with intricate zari embroidery. Perfect for wedding celebrations and formal ceremonies.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/grey-churidar/600/800', 'bottom', 'churidar', '{"#36454F"}', 'solid', 'cotton', '{"casual","formal"}', 3, '{"fall","winter","spring"}', 'Charcoal Grey Cotton Churidar', 'Sleek charcoal grey churidar in breathable cotton. Pairs well with both casual kurtas and formal kurta suits.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/coral-dress/600/800', 'dress', 'chiffon dress', '{"#FF7F50","#FF69B4"}', 'floral', 'chiffon', '{"party","casual","date"}', 3, '{"spring","summer"}', 'Coral Pink Floral Chiffon Dress', 'Light and breezy coral chiffon dress with delicate floral prints. Ideal for garden parties and casual dates.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/black-blazer/600/800', 'outerwear', 'blazer', '{"#000000"}', 'solid', 'wool blend', '{"formal","office","business"}', 5, '{"fall","winter"}', 'Black Wool Blend Formal Blazer', 'Sharp black wool blend blazer with structured shoulders. Essential for formal meetings and professional settings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/white-linen-shirt/600/800', 'top', 'shirt', '{"#FFFFFF"}', 'solid', 'linen', '{"casual","office","business casual"}', 3, '{"spring","summer"}', 'White Linen Button-Down Shirt', 'Crisp white linen shirt with mother-of-pearl buttons. Perfect for business casual days and warm-weather occasions.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/indigo-jeans/600/800', 'bottom', 'jeans', '{"#000080"}', 'solid', 'denim', '{"casual","date","outdoor"}', 2, '{"spring","fall","summer"}', 'Indigo Blue Denim Jeans', 'Classic indigo blue denim jeans with a comfortable mid-rise fit. A wardrobe staple for casual everyday wear.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/maroon-sherwani/600/800', 'traditional', 'sherwani', '{"#800000"}', 'embroidered', 'velvet', '{"wedding","festive","formal"}', 5, '{"winter","fall"}', 'Maroon Velvet Sherwani', 'Regal maroon velvet sherwani with intricate thread and sequin embroidery. The quintessential groom wedding ensemble.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/beige-kurta/600/800', 'top', 'kurta', '{"#F5F5DC"}', 'solid', 'cotton linen blend', '{"casual","summer","outdoor"}', 2, '{"spring","summer"}', 'Beige Cotton Linen Kurta', 'Relaxed beige kurta in breathable cotton-linen blend. Perfect for summer outings and casual get-togethers.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/green-lawn-suit/600/800', 'traditional', 'lawn suit', '{"#008000","#FFFFFF"}', 'embroidered', 'lawn', '{"festive","summer","casual"}', 3, '{"spring","summer"}', 'Green Embroidered Lawn Suit', 'Fresh green lawn suit with delicate embroidery on the collar and placket. Lightweight and perfect for summer festive occasions.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/navy-polo/600/800', 'top', 'polo shirt', '{"#000080","#FFFFFF"}', 'striped', 'cotton piqué', '{"casual","sport","outdoor"}', 2, '{"spring","summer","fall"}', 'Navy Blue Striped Polo Shirt', 'Classic navy and white striped polo in breathable cotton piqué. Great for outdoor events and sport casual occasions.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/gold-dupatta/600/800', 'accessory', 'dupatta', '{"#FFD700","#FFFDD0"}', 'embroidered', 'chiffon', '{"festive","wedding","formal"}', 4, '{"all-season"}', 'Gold Zari Embroidered Dupatta', 'Luxurious chiffon dupatta with rich gold zari embroidery along the borders. Elevates any traditional outfit for special occasions.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/brown-sandals/600/800', 'footwear', 'sandals', '{"#8B4513"}', 'solid', 'leather', '{"casual","beach","outdoor"}', 1, '{"spring","summer"}', 'Brown Leather Sandals', 'Handcrafted brown leather sandals with cushioned footbed. Comfortable and stylish for beach days and casual outings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/black-oxford/600/800', 'footwear', 'oxford shoes', '{"#000000"}', 'solid', 'leather', '{"formal","office","business"}', 5, '{"fall","winter","spring"}', 'Black Formal Oxford Shoes', 'Classic black leather oxford shoes with Goodyear welt construction. The definitive choice for formal business attire.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/red-white-kurti/600/800', 'top', 'kurti', '{"#FF0000","#FFFFFF"}', 'printed', 'cotton', '{"casual","festive","outdoor"}', 2, '{"spring","summer"}', 'Red and White Cotton Kurti', 'Vibrant red and white printed cotton kurti with a flattering A-line silhouette. Perfect for festive celebrations and casual gatherings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/cream-churidar/600/800', 'traditional', 'churidar set', '{"#FFFDD0","#FFD700"}', 'embroidered', 'cotton silk', '{"festive","wedding","formal"}', 4, '{"fall","winter","spring"}', 'Cream Embroidered Churidar Set', 'Elegant cream cotton-silk churidar set with subtle gold thread embroidery. Perfect for engagement ceremonies and festive gatherings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/grey-tshirt/600/800', 'top', 't-shirt', '{"#808080"}', 'solid', 'cotton blend', '{"casual","lounge"}', 1, '{"spring","summer","fall"}', 'Grey Melange Round Neck T-Shirt', 'Soft grey melange round neck t-shirt in a comfortable cotton blend. Your go-to for laid-back weekends and lounging at home.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/black-jeans/600/800', 'bottom', 'jeans', '{"#000000"}', 'solid', 'denim', '{"casual","date","outdoor"}', 2, '{"spring","fall","winter"}', 'Black Ankle-Length Jeans', 'Sleek black ankle-length jeans with a slim fit and slight stretch for comfort. Versatile enough for dates and casual Fridays.', true, NOW());

  RAISE NOTICE 'Successfully seeded 18 demo wardrobe items for user';

END $$;

-- Verify seeding
-- SELECT category, COUNT(*) as count FROM wardrobe_items GROUP BY category ORDER BY category;
