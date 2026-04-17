#!/usr/bin/env npx tsx

/**
 * seed-demo-data.ts — Prompt Closet Phase 1 Demo Data Seeder
 *
 * Seeds 18 clothing items with deterministic mock CLIP embeddings into Supabase.
 * Idempotent: re-running replaces existing demo items for the user.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 *
 * The script reads Supabase credentials from apps/mobile/.env if present,
 * otherwise prompts interactively.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ============================================================
// CONSTANTS
// ============================================================

const EMBEDDING_DIM = 512;
const SEED_EMAIL_DOMAIN = "promptcloset.demo";
const DEMO_PASSWORD = "PromptClosetDemo2026!";

// ============================================================
// TYPES
// ============================================================

interface ClothingItem {
  suggested_name: string;
  category: string;
  subcategory: string;
  colors: string[];
  pattern: string;
  fabric: string;
  occasions: string[];
  formality_score: number;
  season: string[];
  ai_tags: Record<string, unknown>;
}

interface SeededItem {
  id: string;
  suggested_name: string;
  category: string;
  image_url: string;
}

// ============================================================
// .ENV LOADER
// ============================================================

function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

// ============================================================
// INTERACTIVE INPUT
// ============================================================

function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise<string>((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptFor<T>(
  label: string,
  envKey: keyof NodeJS.ProcessEnv,
  secret = false,
): Promise<string> {
  const fromEnv = process.env[envKey];
  if (fromEnv) {
    console.log(`  Using ${label} from .env`);
    return fromEnv;
  }
  const msg = secret
    ? `  Enter ${label} (will be stored in .env): `
    : `  Enter ${label}: `;
  const value = await question(msg);
  if (!value) throw new Error(`${label} is required`);
  return value;
}

// ============================================================
// SUPABASE AUTH (REST API)
// ============================================================

async function supabaseAuth(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  // Try to sign up first
  const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  const signUpData = await signUpRes.json();

  if (signUpRes.ok) {
    console.log(`  Created new demo account: ${email}`);
    if (signUpData.id) {
      return {
        token: signUpData.session?.access_token ?? "",
        userId: signUpData.id,
      };
    }
  }

  if (signUpData.msg === "User already registered") {
    // Try to sign in
    const signInRes = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({ email, password }),
      },
    );

    if (!signInRes.ok) {
      const err = await signInRes.json();
      throw new Error(`Sign-in failed: ${err.msg ?? signInRes.statusText}`);
    }

    const signInData = await signInRes.json();
    console.log(`  Reused existing demo account: ${email}`);
    return { token: signInData.access_token, userId: signInData.user.id };
  }

  throw new Error(`Auth error: ${JSON.stringify(signUpData)}`);
}

// ============================================================
// SUPABASE REST HELPER
// ============================================================

async function dbGet(
  supabaseUrl: string,
  anonKey: string,
  token: string,
  table: string,
  params: string = "",
): Promise<unknown[]> {
  const url = `${supabaseUrl}/rest/v1/${table}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${table} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<unknown[]>;
}

async function dbDelete(
  supabaseUrl: string,
  anonKey: string,
  token: string,
  table: string,
  params: string = "",
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/${table}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok && res.status !== 406 && res.status !== 400) {
    // 406/400 often means nothing to delete
    const body = await res.text();
    throw new Error(`DELETE ${table} failed (${res.status}): ${body}`);
  }
}

async function dbPost(
  supabaseUrl: string,
  anonKey: string,
  token: string,
  table: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`POST ${table} failed (${res.status}): ${errBody}`);
  }
  return res.json();
}

// ============================================================
// DETERMINISTIC MOCK EMBEDDING (mirrors embeddingService.ts)
// ============================================================

function generateMockEmbedding(seed: string): number[] {
  const embedding = new Array<number>(EMBEDDING_DIM);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let state = hash;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    embedding[i] = state / 0xffffffff;
  }
  // Normalize to unit length
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return embedding.map((v) => v / norm);
}

// ============================================================
// 18 DEMO ITEMS
// ============================================================

const DEMO_ITEMS: ClothingItem[] = [
  {
    suggested_name: "Navy Embroidered Cotton Kurta",
    category: "top",
    subcategory: "kurta",
    colors: ["navy blue"],
    pattern: "embroidered",
    fabric: "cotton",
    occasions: ["festive", "casual", "formal"],
    formality_score: 4,
    season: ["spring", "summer", "fall"],
    ai_tags: {
      category: "top",
      subcategory: "kurta",
      colors: ["navy blue"],
      pattern: "embroidered",
      fabric: "cotton",
      occasions: ["festive", "casual", "formal"],
      formality_score: 4,
      season: ["spring", "summer", "fall"],
      suggested_name: "Navy Embroidered Cotton Kurta",
      style_notes:
        "Elegant navy kurta with delicate chikankari embroidery. Versatile for both festive occasions and formal gatherings.",
    },
  },
  {
    suggested_name: "Red Silk Embroidered Saree",
    category: "traditional",
    subcategory: "saree",
    colors: ["red", "gold"],
    pattern: "embroidered",
    fabric: "silk",
    occasions: ["wedding", "festive", "formal"],
    formality_score: 5,
    season: ["all-season"],
    ai_tags: {
      category: "traditional",
      subcategory: "saree",
      colors: ["red", "gold"],
      pattern: "embroidered",
      fabric: "silk",
      occasions: ["wedding", "festive", "formal"],
      formality_score: 5,
      season: ["all-season"],
      suggested_name: "Red Silk Embroidered Saree",
      style_notes:
        "Luxurious silk saree with intricate zari embroidery. Perfect for wedding celebrations and formal ceremonies.",
    },
  },
  {
    suggested_name: "Charcoal Grey Cotton Churidar",
    category: "bottom",
    subcategory: "churidar",
    colors: ["charcoal grey"],
    pattern: "solid",
    fabric: "cotton",
    occasions: ["casual", "formal"],
    formality_score: 3,
    season: ["fall", "winter", "spring"],
    ai_tags: {
      category: "bottom",
      subcategory: "churidar",
      colors: ["charcoal grey"],
      pattern: "solid",
      fabric: "cotton",
      occasions: ["casual", "formal"],
      formality_score: 3,
      season: ["fall", "winter", "spring"],
      suggested_name: "Charcoal Grey Cotton Churidar",
      style_notes:
        "Sleek charcoal grey churidar in breathable cotton. Pairs well with both casual kurtas and formal kurta suits.",
    },
  },
  {
    suggested_name: "Coral Pink Floral Chiffon Dress",
    category: "dress",
    subcategory: "chiffon dress",
    colors: ["coral pink", "floral"],
    pattern: "floral",
    fabric: "chiffon",
    occasions: ["party", "casual", "date"],
    formality_score: 3,
    season: ["spring", "summer"],
    ai_tags: {
      category: "dress",
      subcategory: "chiffon dress",
      colors: ["coral pink", "floral"],
      pattern: "floral",
      fabric: "chiffon",
      occasions: ["party", "casual", "date"],
      formality_score: 3,
      season: ["spring", "summer"],
      suggested_name: "Coral Pink Floral Chiffon Dress",
      style_notes:
        "Light and breezy coral chiffon dress with delicate floral prints. Ideal for garden parties and casual dates.",
    },
  },
  {
    suggested_name: "Black Wool Blend Formal Blazer",
    category: "outerwear",
    subcategory: "blazer",
    colors: ["black"],
    pattern: "solid",
    fabric: "wool blend",
    occasions: ["formal", "office", "business"],
    formality_score: 5,
    season: ["fall", "winter"],
    ai_tags: {
      category: "outerwear",
      subcategory: "blazer",
      colors: ["black"],
      pattern: "solid",
      fabric: "wool blend",
      occasions: ["formal", "office", "business"],
      formality_score: 5,
      season: ["fall", "winter"],
      suggested_name: "Black Wool Blend Formal Blazer",
      style_notes:
        "Sharp black wool blend blazer with structured shoulders. Essential for formal meetings and professional settings.",
    },
  },
  {
    suggested_name: "White Linen Button-Down Shirt",
    category: "top",
    subcategory: "shirt",
    colors: ["white"],
    pattern: "solid",
    fabric: "linen",
    occasions: ["casual", "office", "business casual"],
    formality_score: 3,
    season: ["spring", "summer"],
    ai_tags: {
      category: "top",
      subcategory: "shirt",
      colors: ["white"],
      pattern: "solid",
      fabric: "linen",
      occasions: ["casual", "office", "business casual"],
      formality_score: 3,
      season: ["spring", "summer"],
      suggested_name: "White Linen Button-Down Shirt",
      style_notes:
        "Crisp white linen shirt with mother-of-pearl buttons. Perfect for business casual days and warm-weather occasions.",
    },
  },
  {
    suggested_name: "Indigo Blue Denim Jeans",
    category: "bottom",
    subcategory: "jeans",
    colors: ["indigo blue"],
    pattern: "solid",
    fabric: "denim",
    occasions: ["casual", "date", "outdoor"],
    formality_score: 2,
    season: ["spring", "fall", "summer"],
    ai_tags: {
      category: "bottom",
      subcategory: "jeans",
      colors: ["indigo blue"],
      pattern: "solid",
      fabric: "denim",
      occasions: ["casual", "date", "outdoor"],
      formality_score: 2,
      season: ["spring", "fall", "summer"],
      suggested_name: "Indigo Blue Denim Jeans",
      style_notes:
        "Classic indigo blue denim jeans with a comfortable mid-rise fit. A wardrobe staple for casual everyday wear.",
    },
  },
  {
    suggested_name: "Maroon Velvet Sherwani",
    category: "traditional",
    subcategory: "sherwani",
    colors: ["maroon"],
    pattern: "embroidered",
    fabric: "velvet",
    occasions: ["wedding", "festive", "formal"],
    formality_score: 5,
    season: ["winter", "fall"],
    ai_tags: {
      category: "traditional",
      subcategory: "sherwani",
      colors: ["maroon"],
      pattern: "embroidered",
      fabric: "velvet",
      occasions: ["wedding", "festive", "formal"],
      formality_score: 5,
      season: ["winter", "fall"],
      suggested_name: "Maroon Velvet Sherwani",
      style_notes:
        "Regal maroon velvet sherwani with intricate thread and sequin embroidery. The quintessential groom's wedding ensemble.",
    },
  },
  {
    suggested_name: "Beige Cotton Linen Kurta",
    category: "top",
    subcategory: "kurta",
    colors: ["beige"],
    pattern: "solid",
    fabric: "cotton linen blend",
    occasions: ["casual", "summer", "outdoor"],
    formality_score: 2,
    season: ["spring", "summer"],
    ai_tags: {
      category: "top",
      subcategory: "kurta",
      colors: ["beige"],
      pattern: "solid",
      fabric: "cotton linen blend",
      occasions: ["casual", "summer", "outdoor"],
      formality_score: 2,
      season: ["spring", "summer"],
      suggested_name: "Beige Cotton Linen Kurta",
      style_notes:
        "Relaxed beige kurta in breathable cotton-linen blend. Perfect for summer outings and casual get-togethers.",
    },
  },
  {
    suggested_name: "Green Embroidered Lawn Suit",
    category: "traditional",
    subcategory: "lawn suit",
    colors: ["green", "white"],
    pattern: "embroidered",
    fabric: "lawn",
    occasions: ["festive", "summer", "casual"],
    formality_score: 3,
    season: ["spring", "summer"],
    ai_tags: {
      category: "traditional",
      subcategory: "lawn suit",
      colors: ["green", "white"],
      pattern: "embroidered",
      fabric: "lawn",
      occasions: ["festive", "summer", "casual"],
      formality_score: 3,
      season: ["spring", "summer"],
      suggested_name: "Green Embroidered Lawn Suit",
      style_notes:
        "Fresh green lawn suit with delicate embroidery on the collar and placket. Lightweight and perfect for summer festive occasions.",
    },
  },
  {
    suggested_name: "Navy Blue Striped Polo Shirt",
    category: "top",
    subcategory: "polo shirt",
    colors: ["navy blue", "white"],
    pattern: "striped",
    fabric: "cotton piqué",
    occasions: ["casual", "sport", "outdoor"],
    formality_score: 2,
    season: ["spring", "summer", "fall"],
    ai_tags: {
      category: "top",
      subcategory: "polo shirt",
      colors: ["navy blue", "white"],
      pattern: "striped",
      fabric: "cotton piqué",
      occasions: ["casual", "sport", "outdoor"],
      formality_score: 2,
      season: ["spring", "summer", "fall"],
      suggested_name: "Navy Blue Striped Polo Shirt",
      style_notes:
        "Classic navy and white striped polo in breathable cotton piqué. Great for outdoor events and sport casual occasions.",
    },
  },
  {
    suggested_name: "Gold Zari Embroidered Dupatta",
    category: "accessory",
    subcategory: "dupatta",
    colors: ["gold", "cream"],
    pattern: "embroidered",
    fabric: "chiffon",
    occasions: ["festive", "wedding", "formal"],
    formality_score: 4,
    season: ["all-season"],
    ai_tags: {
      category: "accessory",
      subcategory: "dupatta",
      colors: ["gold", "cream"],
      pattern: "embroidered",
      fabric: "chiffon",
      occasions: ["festive", "wedding", "formal"],
      formality_score: 4,
      season: ["all-season"],
      suggested_name: "Gold Zari Embroidered Dupatta",
      style_notes:
        "Luxurious chiffon dupatta with rich gold zari embroidery along the borders. Elevates any traditional outfit for special occasions.",
    },
  },
  {
    suggested_name: "Brown Leather Sandals",
    category: "footwear",
    subcategory: "sandals",
    colors: ["brown"],
    pattern: "solid",
    fabric: "leather",
    occasions: ["casual", "beach", "outdoor"],
    formality_score: 1,
    season: ["spring", "summer"],
    ai_tags: {
      category: "footwear",
      subcategory: "sandals",
      colors: ["brown"],
      pattern: "solid",
      fabric: "leather",
      occasions: ["casual", "beach", "outdoor"],
      formality_score: 1,
      season: ["spring", "summer"],
      suggested_name: "Brown Leather Sandals",
      style_notes:
        "Handcrafted brown leather sandals with cushioned footbed. Comfortable and stylish for beach days and casual outings.",
    },
  },
  {
    suggested_name: "Black Formal Oxford Shoes",
    category: "footwear",
    subcategory: "oxford shoes",
    colors: ["black"],
    pattern: "solid",
    fabric: "leather",
    occasions: ["formal", "office", "business"],
    formality_score: 5,
    season: ["fall", "winter", "spring"],
    ai_tags: {
      category: "footwear",
      subcategory: "oxford shoes",
      colors: ["black"],
      pattern: "solid",
      fabric: "leather",
      occasions: ["formal", "office", "business"],
      formality_score: 5,
      season: ["fall", "winter", "spring"],
      suggested_name: "Black Formal Oxford Shoes",
      style_notes:
        "Classic black leather oxford shoes with Goodyear welt construction. The definitive choice for formal business attire.",
    },
  },
  {
    suggested_name: "Red and White Cotton Kurti",
    category: "top",
    subcategory: "kurti",
    colors: ["red", "white"],
    pattern: "printed",
    fabric: "cotton",
    occasions: ["casual", "festive", "outdoor"],
    formality_score: 2,
    season: ["spring", "summer"],
    ai_tags: {
      category: "top",
      subcategory: "kurti",
      colors: ["red", "white"],
      pattern: "printed",
      fabric: "cotton",
      occasions: ["casual", "festive", "outdoor"],
      formality_score: 2,
      season: ["spring", "summer"],
      suggested_name: "Red and White Cotton Kurti",
      style_notes:
        "Vibrant red and white printed cotton kurti with a flattering A-line silhouette. Perfect for festive celebrations and casual gatherings.",
    },
  },
  {
    suggested_name: "Cream Embroidered Churidar Set",
    category: "traditional",
    subcategory: "churidar set",
    colors: ["cream", "gold"],
    pattern: "embroidered",
    fabric: "cotton silk",
    occasions: ["festive", "wedding", "formal"],
    formality_score: 4,
    season: ["fall", "winter", "spring"],
    ai_tags: {
      category: "traditional",
      subcategory: "churidar set",
      colors: ["cream", "gold"],
      pattern: "embroidered",
      fabric: "cotton silk",
      occasions: ["festive", "wedding", "formal"],
      formality_score: 4,
      season: ["fall", "winter", "spring"],
      suggested_name: "Cream Embroidered Churidar Set",
      style_notes:
        "Elegant cream cotton-silk churidar set with subtle gold thread embroidery. Perfect for engagement ceremonies and festive gatherings.",
    },
  },
  {
    suggested_name: "Grey Melange Round Neck T-Shirt",
    category: "top",
    subcategory: "t-shirt",
    colors: ["grey"],
    pattern: "solid",
    fabric: "cotton blend",
    occasions: ["casual", "very casual", "lounge"],
    formality_score: 1,
    season: ["spring", "summer", "fall"],
    ai_tags: {
      category: "top",
      subcategory: "t-shirt",
      colors: ["grey"],
      pattern: "solid",
      fabric: "cotton blend",
      occasions: ["casual", "very casual", "lounge"],
      formality_score: 1,
      season: ["spring", "summer", "fall"],
      suggested_name: "Grey Melange Round Neck T-Shirt",
      style_notes:
        "Soft grey melange round neck t-shirt in a comfortable cotton blend. Your go-to for laid-back weekends and lounging at home.",
    },
  },
  {
    suggested_name: "Black Ankle-Length Jeans",
    category: "bottom",
    subcategory: "jeans",
    colors: ["black"],
    pattern: "solid",
    fabric: "denim",
    occasions: ["casual", "date", "outdoor"],
    formality_score: 2,
    season: ["spring", "fall", "winter"],
    ai_tags: {
      category: "bottom",
      subcategory: "jeans",
      colors: ["black"],
      pattern: "solid",
      fabric: "denim",
      occasions: ["casual", "date", "outdoor"],
      formality_score: 2,
      season: ["spring", "fall", "winter"],
      suggested_name: "Black Ankle-Length Jeans",
      style_notes:
        "Sleek black ankle-length jeans with a slim fit and slight stretch for comfort. Versatile enough for dates and casual Fridays.",
    },
  },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("\n=== Prompt Closet — Demo Data Seeder ===\n");

  // 1. Load .env
  loadEnv();

  // 2. Gather config
  console.log("Configuration:");
  const supabaseUrl = await promptFor(
    "Supabase URL",
    "EXPO_PUBLIC_SUPABASE_URL",
  );
  const anonKey = await promptFor(
    "Supabase Anon Key",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
  const demoEmail =
    process.env.DEMO_USER_EMAIL ??
    (await question(`  Demo user email [demo@${SEED_EMAIL_DOMAIN}]: `));
  const finalEmail = demoEmail || `demo@${SEED_EMAIL_DOMAIN}`;
  const demoPassword = process.env.DEMO_USER_PASSWORD ?? DEMO_PASSWORD;

  console.log();

  // 3. Authenticate
  console.log("Authenticating with Supabase...");
  let token: string;
  let userId: string;
  try {
    ({ token, userId } = await supabaseAuth(
      supabaseUrl,
      anonKey,
      finalEmail,
      demoPassword,
    ));
    console.log(`  Authenticated as user: ${userId}\n`);
  } catch (err) {
    console.error(`  ERROR: ${(err as Error).message}`);
    process.exit(1);
  }

  // 4. Delete existing demo items (idempotent)
  console.log("Cleaning up existing demo items...");
  try {
    // Get existing demo wardrobe items for this user
    const existing = (await dbGet(
      supabaseUrl,
      anonKey,
      token,
      "wardrobe_items",
      `user_id=eq.${userId}&is_active=eq.true&select=id`,
    )) as Array<{ id: string }>;

    if (existing.length > 0) {
      console.log(`  Found ${existing.length} existing items — deleting...`);
      await dbDelete(
        supabaseUrl,
        anonKey,
        token,
        "wardrobe_items",
        `user_id=eq.${userId}`,
      );
      console.log("  Cleanup complete.\n");
    } else {
      console.log("  No existing demo items found — starting fresh.\n");
    }
  } catch (err) {
    console.warn(`  Warning: cleanup error: ${(err as Error).message}`);
    console.warn("  Continuing with seed anyway...\n");
  }

  // 5. Seed 18 wardrobe items
  console.log("Seeding 18 clothing items...");
  const seededItems: SeededItem[] = [];

  for (let i = 0; i < DEMO_ITEMS.length; i++) {
    const item = DEMO_ITEMS[i];
    const seed = `img_${finalEmail}_${i}_${item.suggested_name}`;
    const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/800`;
    const thumbnailUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/400`;

    const row = {
      user_id: userId,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      category: item.category,
      subcategory: item.subcategory,
      colors: item.colors,
      pattern: item.pattern,
      fabric: item.fabric,
      occasions: item.occasions,
      formality_score: item.formality_score,
      season: item.season,
      ai_tags: item.ai_tags,
      is_active: true,
    };

    try {
      const result = (await dbPost(
        supabaseUrl,
        anonKey,
        token,
        "wardrobe_items",
        row,
      )) as Array<{ id: string }>;

      const id = result[0]?.id;
      if (!id) throw new Error("No id returned from insert");

      seededItems.push({
        id,
        suggested_name: item.suggested_name,
        category: item.category,
        image_url: imageUrl,
      });

      console.log(
        `  [${i + 1}/18] ${item.suggested_name} (${item.category}) — ${id.slice(0, 8)}...`,
      );
    } catch (err) {
      console.error(
        `  [${i + 1}/18] FAILED ${item.suggested_name}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  console.log(`\n  Inserted ${seededItems.length} wardrobe items.\n`);

  // 6. Generate and insert embeddings
  console.log("Generating deterministic mock embeddings...");
  const embeddingInsertPromises: Promise<void>[] = [];

  for (let i = 0; i < seededItems.length; i++) {
    const seeded = seededItems[i];
    const embedding = generateMockEmbedding(
      `img_${seeded.image_url}_${seeded.suggested_name}`,
    );

    embeddingInsertPromises.push(
      (async () => {
        await dbPost(supabaseUrl, anonKey, token, "item_embeddings", {
          item_id: seeded.id,
          user_id: userId,
          clip_embedding: embedding,
        });
        console.log(
          `  [${i + 1}/18] Embedding for "${seeded.suggested_name}" — dim=${embedding.length}`,
        );
      })(),
    );
  }

  await Promise.all(embeddingInsertPromises);
  console.log("\n  All embeddings inserted.\n");

  // 7. Verify — fetch and print summary
  console.log("Verifying seeded data...");
  try {
    const verified = (await dbGet(
      supabaseUrl,
      anonKey,
      token,
      "wardrobe_items",
      `user_id=eq.${userId}&is_active=eq.true&select=id,category,suggested_name:ai_tags->>suggested_name,image_url,colors,formality_score&order=created_at.asc`,
    )) as Array<{
      id: string;
      category: string;
      suggested_name: string | null;
      image_url: string;
      colors: string[];
      formality_score: number;
    }>;

    const embeddings = (await dbGet(
      supabaseUrl,
      anonKey,
      token,
      "item_embeddings",
      `user_id=eq.${userId}&select=item_id,clip_embedding`,
    )) as Array<{ item_id: string; clip_embedding: number[] }>;

    console.log("\n=== Seeding Complete ===\n");
    console.log(`User: ${finalEmail}`);
    console.log(`User ID: ${userId}`);
    console.log(`Wardrobe items: ${verified.length}`);
    console.log(`Embeddings: ${embeddings.length}\n`);

    console.log("Items:");
    for (const item of verified) {
      const emb = embeddings.find((e) => e.item_id === item.id);
      console.log(
        `  • ${item.suggested_name ?? "(unnamed)"} [${item.category}] ` +
          `formality=${item.formality_score} ` +
          `colors=${item.colors.join(", ")} ` +
          `embedding_dim=${emb?.clip_embedding.length ?? "MISSING"}`,
      );
    }

    // Verify all embeddings are 512-dim
    const badDims = embeddings.filter(
      (e) => e.clip_embedding.length !== EMBEDDING_DIM,
    );
    if (badDims.length > 0) {
      console.error(
        `\nERROR: ${badDims.length} embeddings have wrong dimension (expected ${EMBEDDING_DIM})`,
      );
      process.exit(1);
    }

    console.log(`\nAll embeddings verified: ${EMBEDDING_DIM}-dimensional.\n`);
  } catch (err) {
    console.error(`Verification failed: ${(err as Error).message}`);
    console.error("Data was seeded but verification query failed.");
    process.exit(1);
  }

  console.log("Done. Run the app and sign in with your demo account.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
