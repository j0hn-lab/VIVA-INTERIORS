/* ============================================================
   VIVA INTERIORS — cart.js
   Cart state, wishlist, localStorage persistence, WA checkout
   ============================================================ */

let cart     = JSON.parse(localStorage.getItem("viva_cart"))     || [];
let wishlist = JSON.parse(localStorage.getItem("viva_wishlist")) || [];

function saveCart()     { localStorage.setItem("viva_cart",     JSON.stringify(cart));     }
function saveWishlist() { localStorage.setItem("viva_wishlist", JSON.stringify(wishlist)); }

function fmt(price) {
  return `${CONFIG.currency} ${price.toLocaleString("en-KE")}`;
}

/* ── CART ────────────────────────────────────────────────── */
function cartAdd(productId, qty = 1) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) { existing.qty += qty; }
  else { cart.push({ id: productId, qty }); }
  saveCart();
  renderCart();
  updateBadges();
  showToast(`🛋️ "${product.name.slice(0, 30)}…" added to cart!`, "success");
}

function cartRemove(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart(); renderCart(); updateBadges();
}

function cartSetQty(productId, qty) {
  if (qty < 1) { cartRemove(productId); return; }
  const item = cart.find(i => i.id === productId);
  if (item) item.qty = qty;
  saveCart(); renderCart(); updateBadges();
}

function cartClear() {
  cart = []; saveCart(); renderCart(); updateBadges();
}

function cartTotal() {
  return cart.reduce((sum, item) => {
    const p = PRODUCTS.find(p => p.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function cartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

/* ── WISHLIST ─────────────────────────────────────────────── */
function wishlistToggle(productId) {
  const idx = wishlist.indexOf(productId);
  if (idx === -1) { wishlist.push(productId); showToast("❤️ Added to wishlist!"); }
  else { wishlist.splice(idx, 1); showToast("💔 Removed from wishlist."); }
  saveWishlist();
  updateBadges();
  document.querySelectorAll(`.card-wishlist[data-id="${productId}"]`).forEach(btn => {
    btn.classList.toggle("active", wishlist.includes(productId));
    btn.querySelector("i").className = wishlist.includes(productId)
      ? "fa-solid fa-heart" : "fa-regular fa-heart";
  });
}

function isWishlisted(productId) { return wishlist.includes(productId); }

/* ── WHATSAPP ORDER ──────────────────────────────────────── */
function waOrderProduct(productId, qty = 1) {
  const p = PRODUCTS.find(p => p.id === productId);
  if (!p) return;
  const msg = encodeURIComponent(
    `Hi ${CONFIG.storeName}! 👋\n\nI'd like to inquire/order:\n\n` +
    `🛋️ *${p.name}*\n` +
    `🔢 Qty: ${qty}\n` +
    `💰 Price: ${fmt(p.price)} x ${qty} = *${fmt(p.price * qty)}*\n\n` +
    `Please confirm availability. Thank you!`
  );
  window.open(`https://wa.me/${CONFIG.waNumber}?text=${msg}`, "_blank");
}

function waOrderCart() {
  if (cart.length === 0) return;
  const lines = cart.map(item => {
    const p = PRODUCTS.find(p => p.id === item.id);
    return `• ${p.name} x${item.qty} — ${fmt(p.price * item.qty)}`;
  }).join("\n");
  const msg = encodeURIComponent(
    `Hi ${CONFIG.storeName}! 👋\n\nI'd like to order:\n\n${lines}\n\n` +
    `🧾 *Total: ${fmt(cartTotal())}*\n\n` +
    `📍 Delivery Location: \n📞 Contact Number: \n\nPlease confirm. Thank you!`
  );
  window.open(`https://wa.me/${CONFIG.waNumber}?text=${msg}`, "_blank");
}

/* ── RENDER CART SIDEBAR ─────────────────────────────────── */
function renderCart() {
  const listEl   = document.getElementById("cart-items-list");
  const footerEl = document.getElementById("cart-footer");
  if (!listEl || !footerEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-couch"></i>
        <p>Your cart is empty.</p>
        <p style="font-size:.78rem;color:var(--text-muted)">Browse our furniture collection!</p>
      </div>`;
    footerEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(p => p.id === item.id);
    if (!p) return "";
    return `
      <div class="cart-item" data-cart-item="${p.id}">
        <img class="cart-item-img" src="${p.image}" alt="${p.name}" loading="lazy"/>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${fmt(p.price)}</div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="cartSetQty(${p.id}, ${item.qty - 1})"><i class="fa-solid fa-minus"></i></button>
            <span class="cart-qty-num">${item.qty}</span>
            <button class="cart-qty-btn" onclick="cartSetQty(${p.id}, ${item.qty + 1})"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="cartRemove(${p.id})" title="Remove"><i class="fa-solid fa-trash-can"></i></button>
      </div>`;
  }).join("");

  const subtotal   = cartTotal();
  const delivery   = subtotal >= 50000 ? 0 : 800;
  const grandTotal = subtotal + delivery;

  footerEl.innerHTML = `
    <div class="cart-summary-row">
      <span>Subtotal (${cartCount()} items)</span><span>${fmt(subtotal)}</span>
    </div>
    <div class="cart-summary-row">
      <span>Delivery (Nairobi & beyond)</span>
      <span style="color:var(--success)">${delivery === 0 ? "FREE 🎉" : fmt(delivery)}</span>
    </div>
    ${delivery > 0 ? `<p style="font-size:.72rem;color:var(--text-muted)">Add ${fmt(50000 - subtotal)} more for free delivery</p>` : ""}
    <div class="cart-total-row"><span>Total</span><span>${fmt(grandTotal)}</span></div>
    <button class="cart-wa-btn" onclick="waOrderCart()">
      <i class="fa-brands fa-whatsapp"></i> Order via WhatsApp
    </button>
    <span class="cart-clear-btn" onclick="cartClear()">Clear cart</span>
  `;
}

/* ── BADGES ──────────────────────────────────────────────── */
function updateBadges() {
  const cartBadge     = document.getElementById("cart-count");
  const wishlistBadge = document.getElementById("wishlist-count");
  if (cartBadge)     cartBadge.textContent     = cartCount();
  if (wishlistBadge) wishlistBadge.textContent = wishlist.length;
}