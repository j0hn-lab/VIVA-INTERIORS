/* ============================================================
   VIVA INTERIORS — app.js
   Main initialization with Supabase integration
   ============================================================ */

/* ── getCategories (was missing — caused renderCategoryPills crash) ── */
async function getCategories() {
  if (!supabaseClient) await initSupabase();
  if (!supabaseClient) throw new Error("No Supabase client");
  const { data, error } = await supabaseClient
    .from("categories")
    .select("id, name, slug, icon")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Initialize everything when DOM loads
document.addEventListener("DOMContentLoaded", async () => {
  const hideLoader = () => {
    const loader = document.getElementById("page-loader");
    if (loader) loader.classList.add("hidden");
  };

  // Guarantee loader hides after 5s no matter what
  const loaderTimer = setTimeout(() => {
    hideLoader();
    // Also render built-in products as a last-resort safety net
    if (!window._productsRendered) {
      console.warn("Safety timer fired — rendering built-in products");
      PRODUCTS = applyCatalogImagesToList(PRODUCTS);
      window.PRODUCTS_FROM_DB = PRODUCTS;
      window.renderProducts(PRODUCTS);
    }
  }, 5000);

  try {
    // Initialize Supabase — timeout so it never blocks the page
    await Promise.race([
      initSupabase().catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);

    // Load products — prefer DB, fall back to built-in catalog
    let products = [];
    try {
      console.log("Loading products from database…");
      const dbProducts = await getProducts();
      console.log("Database products loaded:", dbProducts?.length);

      if (dbProducts && dbProducts.length > 0) {
        console.log("Using database products");
        products = dbProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: String(
            p.category_slug ||
            (p.categories && (p.categories.slug || p.categories.name)) ||
            p.category_id ||
            p.category ||
            ""
          ).toLowerCase().replace(/\s+/g, "-"),
          price: Number(p.price) || 0,
          oldPrice: p.old_price,
          badge: p.badge,
          rating: p.rating || 4.5,
          reviews: p.reviews || 0,
          image: getProductDisplayImage(mapDbProduct(p)),
          images: p.images,
          description: p.description,
          tags: p.tags || [],
          inStock: p.in_stock !== false,
          deliveryDays: p.delivery_days,
          comingSoon: !!p.coming_soon,
        }));
      } else {
        console.log("No DB products — using built-in catalog");
        products = applyCatalogImagesToList([...PRODUCTS]);
      }
    } catch (error) {
      console.error("Database query failed — using built-in catalog:", error);
      products = applyCatalogImagesToList([...PRODUCTS]);
    }

    // Store products globally
    window.PRODUCTS_FROM_DB = products;
    PRODUCTS = products;

    // Hide loader & render
    clearTimeout(loaderTimer);
    hideLoader();

    window._productsRendered = true;
    window.renderProducts(sortProductsList(products));

    // Render category pills (from Supabase or local)
    await renderCategoryPills();

    // Render cart & wishlist badges
    renderCart();
    updateBadges();

    // Initialize hero slider & countdown
    initHero();
    initCountdown();

    // Setup event listeners & search
    setupEventListeners();
    setupSearch();

  } catch (fatalError) {
    console.error("App init error:", fatalError);
    clearTimeout(loaderTimer);
    hideLoader();
    // Always fall back to built-in products so page isn't blank
    if (!window._productsRendered) {
      const fallback = applyCatalogImagesToList([...PRODUCTS]);
      window.PRODUCTS_FROM_DB = fallback;
      PRODUCTS = fallback;
      window._productsRendered = true;
      window.renderProducts(sortProductsList(fallback));
    }
  }
});

// Global filter state
let currentCategory = "all";
let currentSort     = "default";
let currentSearch   = "";

function setupEventListeners() {
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) cartBtn.addEventListener("click", openCart);

  const closeCartBtn = document.getElementById("close-cart");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  const cartOverlay = document.getElementById("cart-overlay");
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  const wishlistBtn = document.getElementById("wishlist-btn");
  if (wishlistBtn) wishlistBtn.addEventListener("click", openWishlist);

  const modalClose = document.getElementById("modal-close");
  if (modalClose) modalClose.addEventListener("click", closeModal);
  const modalOverlay = document.getElementById("modal-overlay");
  if (modalOverlay) modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      applyFiltersAndSort();
    });
  }

  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", loadMore);

  const hamburger = document.getElementById("hamburger");
  if (hamburger) hamburger.addEventListener("click", openDrawer);
  const closeDrawerBtn = document.getElementById("close-drawer");
  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
  const drawerOverlay = document.getElementById("drawer-overlay");
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);

  const scrollTopBtn = document.getElementById("scroll-top");
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      scrollTopBtn.classList.toggle("show", window.scrollY > 500);
    });
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const header = document.getElementById("site-header");
  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 100);
    });
  }
}

function setupSearch() {
  const searchInput = document.getElementById("search-input");
  const dropdown    = document.getElementById("search-dropdown");
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = e.target.value;
      if (typeof renderSearchDropdown === "function") renderSearchDropdown(currentSearch);
      applyFiltersAndSort();
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown?.contains(e.target)) {
      dropdown?.classList.remove("show");
    }
  });
}

async function applyFiltersAndSort() {
  let filtered = [...(window.PRODUCTS_FROM_DB || PRODUCTS)];

  if (currentCategory !== "all") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  if (currentSearch && currentSearch.length >= 2) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  switch (currentSort) {
    case "price-asc":  filtered.sort((a, b) => a.price - b.price); break;
    case "price-desc": filtered.sort((a, b) => b.price - a.price); break;
    case "rating":     filtered.sort((a, b) => (b.rating||0) - (a.rating||0)); break;
    default:           filtered.sort((a, b) => a.id - b.id);
  }

  window.renderProducts(filtered);
}

window.filterByCategory = (categoryId) => {
  currentCategory = categoryId;
  document.querySelectorAll(".cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === categoryId);
  });
  applyFiltersAndSort();
};

// Initialize hero slider
function initHero() {
  console.log("Hero slider initialized");
}

// Initialize countdown timer
function initCountdown() {
  console.log("Countdown timer initialized");
}

/* ── RENDER PRODUCTS GRID ─────────────────────────────────── */
window.renderProducts = function(products) {
  console.log("renderProducts called with:", products?.length, "products");
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <i class="fa-solid fa-box-open" style="font-size:3rem;color:var(--text-muted);margin-bottom:16px;display:block;"></i>
        <h3 style="color:var(--text-muted);margin-bottom:8px;">No products found</h3>
        <p style="color:var(--text-muted);">Try adjusting your filters or search terms</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => {
    // Build the image URL the SAME way the splash screen does — direct Pexels CDN URL
    const imgSrc = getProductDisplayImage(product);
    const discount = product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="card-image-wrap">
          <img
            src="${imgSrc}"
            alt="${product.name}"
            loading="eager"
            decoding="async"
            referrerpolicy="no-referrer"
            crossorigin="anonymous"
            onerror="this.onerror=null;this.src='${IMG_FALLBACK}'"
          />
          ${product.badge ? `<span class="card-badge badge-${product.badge}">${product.badge}</span>` : ""}
          ${discount ? `<span class="card-badge badge-discount">-${discount}%</span>` : ""}
          ${!product.inStock ? '<div class="out-of-stock-overlay">Out of Stock</div>' : ""}
          ${product.comingSoon ? '<div class="out-of-stock-overlay">Coming Soon</div>' : ""}
        </div>
        <div class="card-info">
          <h3 class="card-title">${product.name}</h3>
          <p class="card-category">${product.category || "Furniture"}</p>
          <div class="card-price">
            ${product.oldPrice && product.oldPrice > product.price
              ? `<span class="old-price">${fmt(product.oldPrice)}</span>` : ""}
            <span class="current-price">${fmt(product.price)}</span>
          </div>
          <div class="card-actions">
            <button class="btn-primary" onclick="cartAdd(${product.id})">
              <i class="fa-solid fa-bag-shopping"></i> Add to Cart
            </button>
            <button class="btn-ghost card-wishlist ${isWishlisted(product.id) ? "active" : ""}"
              data-id="${product.id}" onclick="wishlistToggle(${product.id})">
              <i class="${isWishlisted(product.id) ? "fa-solid" : "fa-regular"} fa-heart"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join("");

  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.style.display = products.length >= 12 ? "block" : "none";
  }

  // Admin enhancement hook
  setTimeout(() => {
    if (typeof isAdminLoggedIn !== "undefined" && isAdminLoggedIn()) {
      if (typeof enhanceProductCardsWithAdmin !== "undefined") {
        enhanceProductCardsWithAdmin();
      }
    }
  }, 100);
};

/* ── WISHLIST SIDEBAR ─────────────────────────────────────── */
function openWishlist() {
  let sidebar = document.getElementById("wishlist-sidebar");
  if (!sidebar) {
    createWishlistSidebar();
    sidebar = document.getElementById("wishlist-sidebar");
  }
  renderWishlistSidebar();
  sidebar.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeWishlist() {
  const sidebar = document.getElementById("wishlist-sidebar");
  if (sidebar) sidebar.classList.remove("open");
  document.body.style.overflow = "";
}

function createWishlistSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = "wishlist-sidebar";
  sidebar.className = "wishlist-sidebar";
  sidebar.innerHTML = `
    <div class="wishlist-header">
      <h3><i class="fa-regular fa-heart"></i> Wishlist</h3>
      <button id="close-wishlist"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="wishlist-items" id="wishlist-items-list"></div>
  `;
  document.body.appendChild(sidebar);

  const overlay = document.createElement("div");
  overlay.id = "wishlist-overlay";
  overlay.className = "drawer-overlay";
  document.body.appendChild(overlay);

  document.getElementById("close-wishlist")?.addEventListener("click", closeWishlist);
  overlay.addEventListener("click", closeWishlist);
}

function renderWishlistSidebar() {
  const container = document.getElementById("wishlist-items-list");
  if (!container) return;

  const productsList = window.PRODUCTS_FROM_DB || PRODUCTS;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="wishlist-empty">
        <i class="fa-regular fa-heart"></i>
        <p>Your wishlist is empty.</p>
        <p style="font-size:.78rem">Add items you love!</p>
      </div>`;
    return;
  }

  container.innerHTML = wishlist.map(id => {
    const p = productsList.find(pr => pr.id == id);
    if (!p) return "";
    return `
      <div class="wishlist-item">
        <img src="${getProductDisplayImage(p)}" alt="${p.name}"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null;this.src='${IMG_FALLBACK}'" />
        <div class="wishlist-item-info">
          <div class="wishlist-item-name">${p.name}</div>
          <div class="wishlist-item-price">${fmt(p.price)}</div>
          <div class="wishlist-item-actions">
            <button class="wishlist-add-cart" onclick="cartAdd(${p.id}); closeWishlist();">Add to Cart</button>
            <button class="wishlist-remove" onclick="wishlistToggle(${p.id}); renderWishlistSidebar();">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join("");
}

const _origWishlistToggle = wishlistToggle;
window.wishlistToggle = function(productId) {
  _origWishlistToggle(productId);
  const sidebar = document.getElementById("wishlist-sidebar");
  if (sidebar && sidebar.classList.contains("open")) renderWishlistSidebar();
};

/* ── CATEGORY PILLS ───────────────────────────────────────── */
async function renderCategoryPills() {
  const container  = document.getElementById("cat-pills");
  const drawerCats = document.getElementById("drawer-cats");
  if (!container) return;

  let categories = CATEGORIES; // always start with local fallback

  try {
    const dbCats = await getCategories();
    if (dbCats && dbCats.length > 0) {
      // Map DB rows to the same shape as local CATEGORIES
      categories = [
        { id: "all", name: "All Products", icon: "fa-solid fa-border-all" },
        ...dbCats.map(c => ({
          id: c.slug || String(c.id),
          name: c.name,
          icon: c.icon || "fa-solid fa-tag",
        })),
      ];
    }
  } catch {
    console.log("Using local categories");
  }

  container.innerHTML = categories.map((c, i) => `
    <button class="cat-pill ${i === 0 ? "active" : ""}" data-cat="${c.id}"
      onclick="filterByCategory('${c.id}', this)">
      <i class="${c.icon}"></i> ${c.name || c.label}
    </button>
  `).join("");

  if (drawerCats) {
    drawerCats.innerHTML = categories.map(c => `
      <li>
        <button onclick="filterByCategory('${c.id}'); closeDrawer();"
          style="display:flex;align-items:center;gap:10px;padding:14px 20px;width:100%;font-size:.9rem;color:var(--text)">
          <i class="${c.icon}" style="color:var(--primary);width:18px"></i> ${c.name || c.label}
        </button>
      </li>
    `).join("");
  }
}