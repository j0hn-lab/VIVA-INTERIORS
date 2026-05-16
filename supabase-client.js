/* ============================================================
   VIVA INTERIORS — supabase-client.js
   Optional Supabase catalog (used when CONFIG has URL + anon key)
   ============================================================ */

let supabaseClient = null;

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
  const { data, error } = await supabaseClient
    .from("products")
    .select("*, categories(slug, name)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadProductCatalog() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    return PRODUCTS;
  }
  const builtIn = [...PRODUCTS];
  try {
    await initSupabase();
    const rows = await getProducts();
    if (rows.length) {
      PRODUCTS = rows.map((row) => {
        const mapped = mapDbProduct(row);
        if (mapped.image === IMG_FALLBACK && row.name) {
          const local = builtIn.find((p) => p.name === row.name);
          if (local?.image) mapped.image = resolveProductImageUrl(local.image);
        }
        return mapped;
      });
    }
  } catch (err) {
    console.warn("Supabase catalog load failed; using built-in products.", err);
  }
  return PRODUCTS;
}
