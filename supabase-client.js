/* ============================================================
   VIVA INTERIORS — supabase-client.js
   Strategy: render built-in catalog INSTANTLY, then silently
   refresh from Supabase in the background if available.
   ============================================================ */

   let supabaseClient = null;
   const CATALOG_FETCH_MS = 6000; // max wait for DB
   
   function withTimeout(promise, ms, label) {
     return Promise.race([
       promise,
       new Promise((_, reject) =>
         setTimeout(() => reject(new Error(`${label || "Request"} timed out after ${ms}ms`)), ms)
       ),
     ]);
   }
   
   function initSupabase() {
     const url = CONFIG.supabaseUrl;
     const key = CONFIG.supabaseAnonKey;
     if (!url || !key) return Promise.resolve(null);
     if (!window.supabase) return Promise.reject(new Error("Supabase SDK not loaded"));
     if (!supabaseClient) {
       supabaseClient = window.supabase.createClient(url, key);
     }
     return Promise.resolve(supabaseClient);
   }
   
   async function getProducts() {
     if (!supabaseClient) await initSupabase();
     if (!supabaseClient) return [];
   
     // Try each query in order — stop on first success
     const attempts = [
       () => supabaseClient.from("products_with_category").select("*").order("created_at", { ascending: true }),
       () => supabaseClient.from("products").select("*, categories(slug, name)").order("created_at", { ascending: true }),
       () => supabaseClient.from("products").select("*").order("created_at", { ascending: true }),
     ];
   
     let lastError = null;
     for (const run of attempts) {
       try {
         const { data, error } = await withTimeout(run(), 4000, "query");
         if (!error && data && data.length > 0) return data;
         if (error) lastError = error;
       } catch (e) {
         lastError = e;
       }
     }
     throw lastError || new Error("Could not load products from database");
   }
   
   /**
    * loadProductCatalog — called by boot()
    *
    * ALWAYS returns immediately with built-in products so the page
    * renders instantly. A background refresh then checks Supabase
    * and swaps in live DB products if they exist.
    */
   async function loadProductCatalog() {
     // ── STEP 1: Ensure built-ins have proper images & are ready NOW ──
     PRODUCTS = applyCatalogImagesToList([...PRODUCTS]);
   
     // ── STEP 2: Return immediately so boot() can render the page ──
     // Background DB refresh happens after render
     if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
       setTimeout(() => _refreshFromDatabase(), 100);
     }
   
     return PRODUCTS;
   }
   
   async function _refreshFromDatabase() {
     try {
       await withTimeout(initSupabase(), 4000, "Supabase init");
       if (!supabaseClient) return;
   
       const rows = await withTimeout(getProducts(), CATALOG_FETCH_MS, "Product fetch");
   
       if (!rows || !rows.length) {
         console.info("VIVA: DB empty — keeping built-in catalog.");
         return;
       }
   
       const mapped = rows
         .map((row) => {
           try { return mapDbProduct(row); }
           catch (e) { console.warn("Skipping row:", row?.name, e); return null; }
         })
         .filter(Boolean);
   
       if (!mapped.length) {
         console.warn("VIVA: DB rows couldn't be mapped — keeping built-in catalog.");
         return;
       }
   
       PRODUCTS = applyCatalogImagesToList(mapped);
       console.info("VIVA: Catalog refreshed from database —", PRODUCTS.length, "products.");
   
       // Re-render with live DB data (if applyFilters is available)
       if (typeof applyFilters === "function") {
         applyFilters();
       }
   
     } catch (err) {
       // Totally silent — built-ins are already showing, user sees nothing wrong
       console.info("VIVA: DB refresh skipped —", err.message);
     }
   }