/* Kesser theme JS — cart drawer, menu drawer, product form, quantity */
(function () {
  'use strict';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  var moneyFormat = window.themeMoneyFormat || '{{amount}}';

  function formatMoney(cents) {
    var value = (cents / 100).toFixed(2).replace('.', ',');
    var parts = value.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + parts.join(',');
  }

  /* ---------------- Menu drawer ---------------- */
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-menu-open]');
    if (opener) {
      var drawer = qs('#MenuDrawer');
      if (drawer) { drawer.setAttribute('open', ''); document.body.style.overflow = 'hidden'; }
    }
    var closer = e.target.closest('[data-menu-close]');
    if (closer) {
      var d = qs('#MenuDrawer');
      if (d) { d.removeAttribute('open'); document.body.style.overflow = ''; }
    }
  });

  /* ---------------- Cart drawer ---------------- */
  var cartDrawer = qs('#CartDrawer');

  function openCartDrawer() {
    if (cartDrawer) { cartDrawer.setAttribute('open', ''); document.body.style.overflow = 'hidden'; }
  }
  function closeCartDrawer() {
    if (cartDrawer) { cartDrawer.removeAttribute('open'); document.body.style.overflow = ''; }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-open]')) {
      e.preventDefault();
      openCartDrawer();
    }
    if (e.target.closest('[data-cart-close]')) {
      closeCartDrawer();
    }
  });

  function renderCartDrawer(cart) {
    var root = qs('#CartDrawerContent');
    if (!root) return;

    qsa('[data-cart-count-bubble]').forEach(function (el) { el.textContent = cart.item_count; });
    var mobileBubble = qs('[data-cart-count-bubble-mobile]');
    if (mobileBubble) {
      mobileBubble.textContent = cart.item_count;
      mobileBubble.hidden = cart.item_count === 0;
    }

    if (cart.item_count === 0) {
      root.innerHTML =
        '<div class="cart-drawer__empty">' +
        '<p>' + (window.themeStrings.cartEmpty || 'Sua sacola está vazia') + '</p>' +
        '<a href="/collections/all" class="button">' + (window.themeStrings.continueShopping || 'Continuar comprando') + '</a>' +
        '</div>';
      return;
    }

    var itemsHtml = cart.items.map(function (item) {
      return (
        '<div class="cart-line" data-line-key="' + item.key + '">' +
          '<a href="' + item.url + '" class="cart-line__image">' +
            (item.image ? '<img src="' + item.image + '" alt="' + (item.product_title || '') + '" loading="lazy">' : '') +
          '</a>' +
          '<div>' +
            '<a href="' + item.url + '" class="cart-line__title">' + item.product_title + '</a>' +
            (item.variant_title ? '<div class="cart-line__price">' + item.variant_title + '</div>' : '') +
            '<div class="cart-line__price">' + formatMoney(item.final_price) + '</div>' +
            '<div class="cart-line__qty">' +
              '<button type="button" class="qty-btn" data-cart-qty-decrease data-key="' + item.key + '" data-qty="' + (item.quantity - 1) + '" aria-label="Diminuir">-</button>' +
              '<span>' + item.quantity + '</span>' +
              '<button type="button" class="qty-btn" data-cart-qty-increase data-key="' + item.key + '" data-qty="' + (item.quantity + 1) + '" aria-label="Aumentar">+</button>' +
            '</div>' +
            '<button type="button" class="cart-line__remove" data-cart-remove data-key="' + item.key + '">' + (window.themeStrings.remove || 'Remover') + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    root.innerHTML = itemsHtml;

    var subtotalEl = qs('[data-cart-subtotal]');
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
  }

  function fetchCart() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
  }

  function refreshCart() {
    fetchCart().then(renderCartDrawer);
  }

  document.addEventListener('DOMContentLoaded', refreshCart);

  document.addEventListener('click', function (e) {
    var incBtn = e.target.closest('[data-cart-qty-increase], [data-cart-qty-decrease]');
    if (incBtn) {
      var key = incBtn.getAttribute('data-key');
      var qty = parseInt(incBtn.getAttribute('data-qty'), 10);
      updateCartLine(key, Math.max(0, qty));
    }
    var removeBtn = e.target.closest('[data-cart-remove]');
    if (removeBtn) {
      updateCartLine(removeBtn.getAttribute('data-key'), 0);
    }
  });

  function updateCartLine(key, quantity) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) { renderCartDrawer(cart); })
      .catch(function (err) { console.error(err); });
  }

  /* ---------------- Add to cart (product form) ---------------- */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-product-form]');
    if (!form) return;
    e.preventDefault();

    var submitBtn = form.querySelector('[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }

    var formData = new FormData(form);

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (err) { throw err; });
        return r.json();
      })
      .then(function () {
        refreshCart();
        openCartDrawer();
      })
      .catch(function (err) {
        alert((err && err.description) || 'Não foi possível adicionar o produto.');
      })
      .finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
      });
  });

  /* ---------------- Quantity selector (product page) ---------------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-quantity-change]');
    if (!btn) return;
    var wrapper = btn.closest('.quantity-selector');
    var input = wrapper.querySelector('input[name="quantity"]');
    var delta = parseInt(btn.getAttribute('data-quantity-change'), 10);
    var newVal = Math.max(1, parseInt(input.value || '1', 10) + delta);
    input.value = newVal;
  });

  /* ---------------- Variant picker ---------------- */
  qsa('[data-product-form]').forEach(function (form) {
    var productRoot = form.closest('[data-product-root]');
    if (!productRoot) return;
    var productJsonEl = qs('[data-product-json]', productRoot);
    if (!productJsonEl) return;
    var product = JSON.parse(productJsonEl.textContent);

    function getSelectedOptions() {
      return qsa('input[name^="option-"]:checked, select[name^="option-"]', form).map(function (el) { return el.value; });
    }

    function findVariant(options) {
      return product.variants.find(function (v) {
        return v.options.every(function (opt, i) { return opt === options[i]; });
      });
    }

    function updateForVariant() {
      var options = getSelectedOptions();
      var variant = findVariant(options);
      var priceEl = qs('[data-product-price]', form.closest('[data-product-root]'));
      var idInput = qs('input[name="id"]', form);
      var submitBtn = qs('[type="submit"]', form);

      if (variant) {
        if (idInput) idInput.value = variant.id;
        if (priceEl) {
          var html = '';
          if (variant.compare_at_price > variant.price) {
            html += '<s>' + formatMoney(variant.compare_at_price) + '</s> ';
          }
          html += formatMoney(variant.price);
          priceEl.innerHTML = html;
        }
        if (submitBtn) {
          submitBtn.disabled = !variant.available;
          submitBtn.textContent = variant.available
            ? (window.themeStrings.addToCart || 'Adicionar à sacola')
            : (window.themeStrings.soldOut || 'Esgotado');
        }
        if (variant.featured_image) {
          var mainImg = qs('[data-product-main-image]');
          if (mainImg) mainImg.src = variant.featured_image.src;
        }
      } else if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = window.themeStrings.unavailable || 'Indisponível';
      }
    }

    form.addEventListener('change', function (e) {
      if (e.target.name && e.target.name.indexOf('option-') === 0) updateForVariant();
    });

    updateForVariant();
  });

  /* ---------------- Product gallery thumbs ---------------- */
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-gallery-thumb]');
    if (!thumb) return;
    var gallery = thumb.closest('[data-product-gallery]');
    var mainImg = qs('[data-product-main-image]', gallery);
    if (mainImg) mainImg.src = thumb.getAttribute('data-full-src');
    qsa('[data-gallery-thumb]', gallery).forEach(function (t) { t.setAttribute('aria-current', 'false'); });
    thumb.setAttribute('aria-current', 'true');
  });

  /* ---------------- Newsletter form feedback ---------------- */
  qsa('[data-newsletter-form]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var msg = qs('[data-newsletter-message]', form.parentElement);
      if (msg) msg.hidden = false;
    });
  });
})();
