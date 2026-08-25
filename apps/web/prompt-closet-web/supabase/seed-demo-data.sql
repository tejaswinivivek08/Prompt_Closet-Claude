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

  -- Insert 33 demo items (clothing + accessories)
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

  (target_user_id, 'https://picsum.photos/seed/black-jeans/600/800', 'bottom', 'jeans', '{"#000000"}', 'solid', 'denim', '{"casual","date","outdoor"}', 2, '{"spring","fall","winter"}', 'Black Ankle-Length Jeans', 'Sleek black ankle-length jeans with a slim fit and slight stretch for comfort. Versatile enough for dates and casual Fridays.', true, NOW()),

  -- New clothing items
  (target_user_id, 'https://picsum.photos/seed/peach-dinner-dress/600/800', 'dress', 'midi dress', '{"#FFCBA4","#FFB347"}', 'solid', 'chiffon', '{"dinner","date","casual","restaurant"}', 3, '{"spring","summer"}', 'Peach Chiffon Midi Dress', 'Soft peach chiffon midi dress with a flowy silhouette and subtle drape. Perfect for a casual dinner out with your husband — romantic yet effortless.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/red-romantic-dress/600/800', 'dress', 'bodycon dress', '{"#CC0000","#8B0000"}', 'solid', 'satin', '{"dinner","date","party","romantic"}', 4, '{"all-season"}', 'Red Satin Romantic Dinner Dress', 'Deep red satin bodycon dress with a wrap silhouette and subtle sheen. A showstopper for romantic dinner dates and special evenings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/white-formal-shirt/600/800', 'top', 'shirt', '{"#FFFFFF","#F8F8F8"}', 'solid', 'cotton', '{"office","formal","business","meeting"}', 4, '{"all-season"}', 'White Cotton Formal Shirt', 'Crisp white formal shirt with a tailored collar and concealed buttons. A boardroom essential that pairs with everything from blazers to trousers.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/black-formal-pants/600/800', 'bottom', 'trousers', '{"#1C1C1C","#000000"}', 'solid', 'polyester blend', '{"office","formal","business","meeting"}', 4, '{"all-season"}', 'Black Slim Formal Trousers', 'Sleek black slim-fit trousers with a mid-rise and pressed crease. The cornerstone of any formal or business outfit.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/rust-tshirt/600/800', 'top', 't-shirt', '{"#B7410E","#CF6D17"}', 'solid', 'cotton', '{"casual","everyday","lounge","outdoor"}', 1, '{"spring","summer","fall"}', 'Rust Orange Cotton T-Shirt', 'Easy rust orange crew neck tee in 100% breathable cotton. The perfect daily casual wear — throw it on with jeans or shorts and go.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/white-denim-jeans/600/800', 'bottom', 'jeans', '{"#FFFFFF","#F5F5F5"}', 'solid', 'denim', '{"casual","brunch","outdoor","date"}', 2, '{"spring","summer"}', 'White Denim Jeans', 'Clean white slim-fit denim jeans with a bright finish. Effortlessly chic for brunch, outdoor days, and casual date evenings.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/black-skorts/600/800', 'bottom', 'skort', '{"#000000","#1C1C1C"}', 'solid', 'polyester', '{"casual","sport","outdoor","travel"}', 2, '{"spring","summer"}', 'Black Athletic Skorts', 'Flattering black skorts combining a skirt front with built-in shorts. Great for active days, travel, and casual outdoor errands.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/blue-denim-skorts/600/800', 'bottom', 'skort', '{"#3B5998","#6F8FAF"}', 'solid', 'denim', '{"casual","brunch","outdoor","weekend"}', 2, '{"spring","summer"}', 'Blue Denim Skorts', 'Cute denim skorts with a medium wash and relaxed fit. The best of both worlds — skirt style with shorts comfort for weekend adventures.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/purple-tshirt/600/800', 'top', 't-shirt', '{"#6A0DAD","#9B59B6"}', 'solid', 'cotton', '{"casual","everyday","lounge"}', 1, '{"spring","summer","fall"}', 'Purple Cotton Crew Neck T-Shirt', 'Soft lavender-purple crew neck tee in comfortable cotton. A fun pop of colour for casual everyday looks.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/pink-shirt/600/800', 'top', 'shirt', '{"#FFB6C1","#FF69B4"}', 'solid', 'cotton', '{"casual","office","brunch","date"}', 3, '{"spring","summer"}', 'Pink Button-Down Shirt', 'Soft pink button-down shirt in lightweight cotton. Polished enough for a casual office day, relaxed enough for brunch or dates.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/pink-tshirt/600/800', 'top', 't-shirt', '{"#FF69B4","#FFC0CB"}', 'solid', 'cotton', '{"casual","everyday","lounge","outdoor"}', 1, '{"spring","summer"}', 'Pink Graphic Oversized T-Shirt', 'Breezy bubblegum pink oversized tee in cotton jersey. A feel-good everyday staple for errands, walks, and lazy Sundays.', true, NOW()),

  -- Accessories
  (target_user_id, 'https://picsum.photos/seed/gold-watch/600/400', 'accessory', 'watch', '{"#FFD700","#C5A028"}', 'solid', 'metal', '{"formal","office","casual","dinner","date"}', 4, '{"all-season"}', 'Gold-Tone Dress Watch', 'Elegant gold-tone dress watch with a minimalist dial and slim profile. The perfect finishing touch for both formal and smart-casual outfits.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/sunglasses/600/400', 'accessory', 'sunglasses', '{"#000000","#704214"}', 'solid', 'acetate', '{"outdoor","casual","beach","travel","casual"}', 2, '{"spring","summer"}', 'Classic Tortoiseshell Sunglasses', 'Timeless tortoiseshell cat-eye sunglasses with UV400 protection. Stylish shades for beach days, outdoor brunches, and travel.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/pearl-necklace/600/400', 'accessory', 'necklace', '{"#FFFDD0","#F5F5F0"}', 'solid', 'pearl', '{"formal","wedding","festive","dinner","date"}', 4, '{"all-season"}', 'Classic Pearl Strand Necklace', 'Lustrous freshwater pearl strand necklace with a gold-plated clasp. A timeless piece that elevates sarees, dresses, and formal blouses.', true, NOW()),

  (target_user_id, 'https://picsum.photos/seed/tan-tote/600/400', 'accessory', 'bag', '{"#D2B48C","#A0785A"}', 'solid', 'leather', '{"office","casual","travel","outdoor"}', 3, '{"all-season"}', 'Tan Leather Tote Bag', 'Structured tan leather tote with interior zip pocket and magnetic closure. A versatile everyday carry for office, travel, and weekend outings.', true, NOW());

  RAISE NOTICE 'Successfully seeded 33 demo wardrobe items and accessories for user';

END $$;

-- Verify seeding
-- SELECT category, COUNT(*) as count FROM wardrobe_items GROUP BY category ORDER BY category;
