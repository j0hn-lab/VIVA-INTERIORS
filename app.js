/* ============================================================
   VIVA INTERIORS — app.js
   Main initialization with Supabase integration
   ============================================================ */

// Initialize everything when DOM loads
document.addEventListener("DOMContentLoaded", async () => {
  const hideLoader = () => {
    const loader = document.getElementById("page-loader");
    if (loader) loader.classList.add("hidden");
  };

  // Guarantee loader hides after 1.5s no matter what
  const loaderTimer = setTimeout(hideLoader, 1500);

  try {
    // Initialize Supabase — timeout so it never blocks the page
    await Promise.race([
      initSupabase().catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);

    // Load products — ONLY use database products
    let products = [];
    try {
      console.log('Loading products from database...');
      const dbProducts = await getProducts();
      console.log('Database products loaded:', dbProducts?.length);
      
      if (dbProducts && dbProducts.length > 0) {
        console.log('Using database products ONLY');
        products = dbProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: String(p.category_id || ''),
          price: p.price,
          oldPrice: p.old_price,
          badge: p.badge,
          rating: p.rating || 4.5,
          reviews: p.reviews || 0,
          image: productImageFromRow(p),
          images: p.images,
          description: p.description,
          tags: p.tags,
          inStock: p.in_stock,
          deliveryDays: p.delivery_days,
          installationGuide: p.installation_guide
        }));
      } else {
        console.log('No database products found');
        products = [...PRODUCTS];
      }
    } catch (error) {
      console.error('Database query failed:', error);
      products = [...PRODUCTS];
    }

    // Store products globally
    window.PRODUCTS_FROM_DB = products;
    PRODUCTS = products;

    // Hide loader now that data is ready (clears the safety timer too)
    clearTimeout(loaderTimer);
    hideLoader();

    // Render initial products
    window.renderProducts(products);

    // Render category pills (from Supabase or local)
    await renderCategoryPills();

    // Render cart & wishlist badges
    renderCart();
    updateBadges();

    // Initialize hero slider
    initHero();

    // Initialize countdown timer
    initCountdown();

// Initialize hero slider
    initHero();

// Initialize countdown timer
    initCountdown();

    // Setup event listeners
    setupEventListeners();

    // Setup search input
    setupSearch();

  } catch (fatalError) {
    // If anything above crashes, still hide the loader
    console.error('App init error:', fatalError);
    clearTimeout(loaderTimer);
    hideLoader();
    // Don't render local products - only database products should show
  }
});

// Global filter state
let currentCategory = "all";
let currentSort = "default";
let currentSearch = "";

function setupEventListeners() {
  // Cart button
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) cartBtn.addEventListener("click", openCart);
  
  // Close cart
  const closeCartBtn = document.getElementById("close-cart");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  const cartOverlay = document.getElementById("cart-overlay");
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);
  
  // Wishlist button
  const wishlistBtn = document.getElementById("wishlist-btn");
  if (wishlistBtn) wishlistBtn.addEventListener("click", openWishlist);
  
  // Modal close
  const modalClose = document.getElementById("modal-close");
  if (modalClose) modalClose.addEventListener("click", closeModal);
  const modalOverlay = document.getElementById("modal-overlay");
  if (modalOverlay) modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  // Sort select
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Load more button
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", loadMore);
  
  // Mobile drawer
  const hamburger = document.getElementById("hamburger");
  if (hamburger) hamburger.addEventListener("click", openDrawer);
  const closeDrawerBtn = document.getElementById("close-drawer");
  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
  const drawerOverlay = document.getElementById("drawer-overlay");
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
  
  // Scroll to top
  const scrollTopBtn = document.getElementById("scroll-top");
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 500) {
        scrollTopBtn.classList.add("show");
      } else {
        scrollTopBtn.classList.remove("show");
      }
    });
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  
  // Header scroll effect
  const header = document.getElementById("site-header");
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 100) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }
}

function setupSearch() {
  const searchInput = document.getElementById("search-input");
  const dropdown = document.getElementById("search-dropdown");
  
  if (!searchInput) return;
  
  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = e.target.value;
      renderSearchDropdown(currentSearch);
      if (currentSearch.length > 1) {
        applyFiltersAndSort();
      } else if (currentSearch.length === 0) {
        applyFiltersAndSort();
      }
    }, 300);
  });
  
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown?.contains(e.target)) {
      dropdown?.classList.remove("show");
    }
  });
}

async function applyFiltersAndSort() {
  let filtered = window.PRODUCTS_FROM_DB || PRODUCTS;
  
  // Filter by category
  if (currentCategory !== "all") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  
  // Filter by search
  if (currentSearch && currentSearch.length >= 2) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  
  // Sort
  switch (currentSort) {
    case "price-asc":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    default:
      filtered.sort((a, b) => a.id - b.id);
  }
  
  window.renderProducts(filtered);
}

window.filterByCategory = (categoryId, btnElement) => {
  currentCategory = categoryId;
  
  document.querySelectorAll(".cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === categoryId);
  });
  
  applyFiltersAndSort();
};

// Initialize hero slider
function initHero() {
  console.log('Hero slider initialized');
  // Add hero initialization logic here if needed
}

// Initialize countdown timer
function initCountdown() {
  console.log('Countdown timer initialized');
  // Add countdown logic here if needed
}


// Render products to the grid
window.renderProducts = function(products) {
  console.log('renderProducts called with:', products?.length, 'products');
  const grid = document.getElementById('products-grid');
  console.log('Products grid element found:', !!grid);
  if (!grid) return;
  
  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--muted); margin-bottom: 16px; display: block;"></i>
        <h3 style="color: var(--muted); margin-bottom: 8px;">No products found</h3>
        <p style="color: var(--muted);">Try adjusting your filters or search terms</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}">
      <div class="card-image-wrap">
        <img src="${resolveProductImageUrl(product.image || product.image_url)}" alt="${product.name}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${IMG_FALLBACK}'"/>
        ${product.badge ? `<span class="card-badge badge-${product.badge}">${product.badge}</span>` : ''}
        ${!product.inStock ? '<div class="out-of-stock-overlay">Out of Stock</div>' : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title">${product.name}</h3>
        <p class="card-category">${product.category || 'Uncategorized'}</p>
        <div class="card-price">
          ${product.oldPrice && product.oldPrice > product.price ? 
            `<span class="old-price">${fmt(product.oldPrice)}</span>` : ''}
          <span class="current-price">${fmt(product.price)}</span>
        </div>
        <div class="card-actions">
          <button class="btn-primary" onclick="cartAdd(${product.id})">
            <i class="fa-solid fa-bag-shopping"></i> Add to Cart
          </button>
          <button class="btn-ghost" onclick="wishlistToggle(${product.id})">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Update load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = products.length >= 12 ? 'block' : 'none';
  }
};

// Define renderProducts function first
window.renderProducts = function(products) {
  console.log('renderProducts called with:', products?.length, 'products');
  const grid = document.getElementById('products-grid');
  console.log('Products grid element found:', !!grid);
  if (!grid) return;
  
  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--muted); margin-bottom: 16px; display: block;"></i>
        <h3 style="color: var(--muted); margin-bottom: 8px;">No products found</h3>
        <p style="color: var(--muted);">Try adjusting your filters or search terms</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}">
      <div class="card-image-wrap">
        <img src="${resolveProductImageUrl(product.image || product.image_url)}" alt="${product.name}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${IMG_FALLBACK}'"/>
        ${product.badge ? `<span class="card-badge badge-${product.badge}">${product.badge}</span>` : ''}
        ${!product.inStock ? '<div class="out-of-stock-overlay">Out of Stock</div>' : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title">${product.name}</h3>
        <p class="card-category">${product.category || 'Uncategorized'}</p>
        <div class="card-price">
          ${product.oldPrice && product.oldPrice > product.price ? 
            `<span class="old-price">${fmt(product.oldPrice)}</span>` : ''}
          <span class="current-price">${fmt(product.price)}</span>
        </div>
        <div class="card-actions">
          <button class="btn-primary" onclick="cartAdd(${product.id})">
            <i class="fa-solid fa-bag-shopping"></i> Add to Cart
          </button>
          <button class="btn-ghost" onclick="wishlistToggle(${product.id})">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Update load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = products.length >= 12 ? 'block' : 'none';
  }
};

// Then add admin enhancement
const originalRenderProducts = window.renderProducts;
if (originalRenderProducts) {
  window.renderProducts = function(products) {
    originalRenderProducts(products);
    setTimeout(() => {
      if (typeof isAdminLoggedIn !== 'undefined' && isAdminLoggedIn()) {
        if (typeof enhanceProductCardsWithAdmin !== 'undefined') {
          enhanceProductCardsWithAdmin();
        }
      }
    }, 100);
  };
}

function openWishlist() {
  let wishlistSidebar = document.getElementById("wishlist-sidebar");
  if (!wishlistSidebar) {
    createWishlistSidebar();
    wishlistSidebar = document.getElementById("wishlist-sidebar");
  }
  renderWishlistSidebar();
  wishlistSidebar.classList.add("open");
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
        <img src="${p.image}" alt="${p.name}"/>
        <div class="wishlist-item-info">
          <div class="wishlist-item-name">${p.name}</div>
          <div class="wishlist-item-price">${fmt(p.price)}</div>
          <div class="wishlist-item-actions">
            <button class="wishlist-add-cart" onclick="cartAdd(${p.id}); closeWishlist();">Add to Cart</button>
            <button class="wishlist-remove" onclick="wishlistToggle(${p.id}); renderWishlistSidebar();"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      </div>`;
  }).join("");
}

const originalWishlistToggle = wishlistToggle;
window.wishlistToggle = function(productId) {
  originalWishlistToggle(productId);
  const sidebar = document.getElementById("wishlist-sidebar");
  if (sidebar && sidebar.classList.contains("open")) {
    renderWishlistSidebar();
  }
};

async function renderCategoryPills() {
  const container = document.getElementById("cat-pills");
  const drawerCats = document.getElementById("drawer-cats");
  if (!container) return;
  
  let categories = CATEGORIES;
  
  try {
    const dbCategories = await getCategories();
    if (dbCategories && dbCategories.length > 0) {
      categories = dbCategories;
    }
  } catch (error) {
    console.log('Using local categories');
  }
  
  container.innerHTML = categories.map((c, i) => `
    <button class="cat-pill ${i === 0 ? "active" : ""}" data-cat="${c.id}" onclick="filterByCategory('${c.id}', this)">
      <i class="${c.icon}"></i> ${c.name}
    </button>
  `).join("");
  
  if (drawerCats) {
    drawerCats.innerHTML = categories.map(c => `
      <li>
        <button onclick="filterByCategory('${c.id}'); closeDrawer();" style="display:flex;align-items:center;gap:10px;padding:14px 20px;width:100%;font-size:.9rem;color:var(--text)">
          <i class="${c.icon}" style="color:var(--primary);width:18px"></i> ${c.name}
        </button>
      </li>
    `).join("");
  }
}