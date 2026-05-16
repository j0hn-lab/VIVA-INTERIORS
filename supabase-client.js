/* ============================================================
   VIVA INTERIORS — supabase-client.js
   ============================================================ */

let supabaseClient = null;
const CATALOG_FETCH_MS = 8000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label || "Request"} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function initSupabase() {
  const url = CONFIG.supabaseUrl;
  const key = CONFIG.supabaseAnonKey;
  if (!url || !key) {
    return Promise.resolve(null);
  }
  if (!window.supabase) {
    return Promise.reject(new Error("Supabase SDK not loaded"));
  }
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(url, key);
  }
  return Promise.resolve(supabaseClient);
}

async function getProducts() {
  if (!supabaseClient) await initSupabase();
  if (!supabaseClient) return [];

  // Prefer view (category_slug); fall back to plain products + join; then products only
  const attempts = [
    () => supabaseClient.from("products_with_category").select("*").order("created_at", { ascending: true }),
    () => supabaseClient.from("products").select("*, categories(slug, name)").order("created_at", { ascending: true }),
    () => supabaseClient.from("products").select("*").order("created_at", { ascending: true }),
  ];

  let lastError = null;
  for (const run of attempts) {
    const { data, error } = await run();
    if (!error && data) return data;
    lastError = error;
    console.warn("Supabase products query failed, trying fallback:", error?.message || error);
  }
  throw lastError || new Error("Could not load products");
}

async function loadProductCatalog() {
  const builtIn = [...PRODUCTS];

  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    return builtIn;
  }

  try {
    await withTimeout(initSupabase(), 5000, "Supabase init");
    const rows = await withTimeout(getProducts(), CATALOG_FETCH_MS, "Product fetch");

    if (rows && rows.length > 0) {
      PRODUCTS = applyCatalogImagesToList(
        rows.map((row) => {
          try {
            return mapDbProduct(row);
          } catch (rowErr) {
            console.warn("Skipping product row:", row?.name, rowErr);
            return null;
          }
        }).filter(Boolean)
      );

      if (!PRODUCTS.length) {
        console.warn("DB products could not be mapped; using built-in catalog.");
        PRODUCTS = applyCatalogImagesToList(builtIn);
      }
    } else {
      console.warn("No products in database; using built-in catalog.");
      PRODUCTS = applyCatalogImagesToList(builtIn);
    }
  } catch (err) {
    console.warn("Supabase catalog load failed; using built-in products.", err);
    PRODUCTS = applyCatalogImagesToList(builtIn);
  }

  return PRODUCTS;
}
