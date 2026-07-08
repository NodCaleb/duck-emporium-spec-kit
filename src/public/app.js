/**
 * The Rubber Duck Emporium — Vanilla SPA
 * Single ES-module entry point; no build step required.
 */

// ─── Session Management ────────────────────────────────────────────────────────
/**
 * Returns the session ID for this browser tab, generating and persisting one
 * the first time it is called.
 *
 * @returns {string}
 */
function getSessionId() {
  let id = sessionStorage.getItem('x-session-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('x-session-id', id);
  }
  return id;
}

// ─── API Wrapper ───────────────────────────────────────────────────────────────
/**
 * Thin wrapper around fetch that:
 *  - Injects the X-Session-ID header on every request.
 *  - Parses the JSON envelope and throws on `success: false`.
 *  - Returns `data` on success.
 *
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path  API path (e.g. '/api/catalog')
 * @param {object} [body]  Request body (will be JSON-serialised)
 * @returns {Promise<object>}
 */
async function fetchAPI(method, path, body = undefined) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(path, opts);

  let json;
  try {
    json = await res.json();
  } catch {
    const err = new Error('Unexpected server response. Please try again.');
    err.status = res.status;
    throw err;
  }

  if (!json.success) {
    const err = new Error(json.error || 'An unexpected error occurred');
    err.status = res.status;
    throw err;
  }

  return json.data;
}

// ─── View Router ───────────────────────────────────────────────────────────────
/**
 * Shows the named view section and hides all others.
 *
 * @param {string} name  Matches `view-<name>` element ID
 */
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById(`view-${name}`);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

// ─── Error / Success Helpers ───────────────────────────────────────────────────
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

/**
 * Converts a thrown API error into a human-friendly string.
 *
 * @param {Error & {status?: number}} err
 * @returns {string}
 */
function friendlyError(err) {
  if (err.status === 404) return err.message || 'That item could not be found.';
  if (err.status === 409)
    return err.message || 'Request conflict — please check stock and try again.';
  if (err.status === 400)
    return err.message || 'Invalid input — please check your details and try again.';
  return err.message || 'Something went wrong. Please try again.';
}

/** Escapes a string for safe insertion as element text (via innerHTML). */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

/** Returns the CSS class for a stockLabel string. */
function stockClass(label) {
  if (label === 'Sold out') return 'stock-out';
  if (typeof label === 'string' && label.startsWith('Only')) return 'stock-low';
  return 'stock-in';
}

// ─── Cart Count Badge ──────────────────────────────────────────────────────────
async function refreshCartCount() {
  try {
    const data = await fetchAPI('GET', '/api/cart');
    const items = data.items || [];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
  } catch {
    // Silently ignore — badge update is non-critical
  }
}

// ─── Catalog View ──────────────────────────────────────────────────────────────
/** Reads the current filter inputs and returns a plain object. */
function getCurrentFilters() {
  return {
    search: document.getElementById('search-input').value.trim(),
    category: document.getElementById('category-filter').value,
    minPrice: document.getElementById('min-price').value.trim(),
    maxPrice: document.getElementById('max-price').value.trim(),
  };
}

/**
 * Fetches the duck catalog with optional filters and renders the grid.
 *
 * @param {object} [filters]
 */
async function loadCatalog(filters = {}) {
  const grid = document.getElementById('duck-grid');
  hideError('catalog-error');
  grid.innerHTML = '<p class="loading">Loading ducks…</p>';

  try {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    const qs = params.toString() ? `?${params}` : '';

    const data = await fetchAPI('GET', `/api/catalog${qs}`);
    const ducks = data.ducks || [];

    if (ducks.length === 0) {
      grid.innerHTML = '<p class="empty-state">No ducks found. Try clearing your filters.</p>';
      return;
    }

    grid.innerHTML = ducks
      .map(
        (duck) => `
      <article class="duck-card">
        <div class="duck-emoji">🦆</div>
        <h2 class="duck-name">${esc(duck.name)}</h2>
        <span class="duck-category">${esc(duck.category)}</span>
        <p class="duck-tagline">${esc(duck.tagline)}</p>
        <div class="duck-footer">
          <span class="duck-price">$${Number(duck.price).toFixed(2)}</span>
          <span class="duck-stock ${stockClass(duck.stockLabel)}">${esc(duck.stockLabel)}</span>
        </div>
        <button class="btn-secondary view-detail-btn" data-id="${duck.id}">View Details</button>
      </article>
    `,
      )
      .join('');

    grid.querySelectorAll('.view-detail-btn').forEach((btn) => {
      btn.addEventListener('click', () => loadDuckDetail(Number(btn.dataset.id)));
    });
  } catch (err) {
    grid.innerHTML = '';
    showError('catalog-error', friendlyError(err));
  }
}

// ─── Duck Detail View ──────────────────────────────────────────────────────────
/**
 * Fetches and renders the full detail page for a duck.
 *
 * @param {number} id
 */
async function loadDuckDetail(id) {
  showView('duck-detail');
  hideError('duck-detail-error');
  const content = document.getElementById('duck-detail-content');
  content.innerHTML = '<p class="loading">Loading duck details…</p>';

  try {
    const data = await fetchAPI('GET', `/api/catalog/${id}`);
    const duck = data.duck;
    const sold = duck.stockLabel === 'Sold out';
    const traits = Array.isArray(duck.personalityTraits)
      ? duck.personalityTraits.map((t) => `<li>${esc(t)}</li>`).join('')
      : '';

    content.innerHTML = `
      <div class="duck-detail">
        <div class="duck-detail-emoji">🦆</div>
        <h1>${esc(duck.name)}</h1>
        <span class="duck-category">${esc(duck.category)}</span>
        <p class="duck-price-large">$${Number(duck.price).toFixed(2)}</p>
        <span class="duck-stock ${stockClass(duck.stockLabel)}">${esc(duck.stockLabel)}</span>
        <p class="duck-tagline" style="margin-top:12px">${esc(duck.tagline)}</p>
        <div class="duck-description">
          <h2>About this Duck</h2>
          <p>${esc(duck.description)}</p>
        </div>
        <div class="duck-traits">
          <h2>Personality Traits</h2>
          <ul>${traits}</ul>
        </div>
        <div class="add-to-cart-section">
          <label for="detail-qty">Qty:</label>
          <input type="number" id="detail-qty" value="1" min="1"
                 max="${duck.stock > 0 ? duck.stock : 1}"
                 ${sold ? 'disabled' : ''}>
          <button id="add-to-cart-btn" class="btn-primary"
                  ${sold ? 'disabled' : ''} data-id="${duck.id}">
            ${sold ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
        <div id="add-to-cart-error" class="error-msg hidden" role="alert"></div>
        <div id="add-to-cart-success" class="success-msg hidden" role="status"></div>
      </div>
    `;

    if (!sold) {
      document.getElementById('add-to-cart-btn').addEventListener('click', async () => {
        const qty = Math.max(1, parseInt(document.getElementById('detail-qty').value, 10) || 1);
        await addToCart(duck.id, qty);
      });
    }
  } catch (err) {
    content.innerHTML = '';
    showError('duck-detail-error', friendlyError(err));
  }
}

/**
 * Adds a duck to the cart and refreshes the cart count badge.
 *
 * @param {number} duckId
 * @param {number} quantity
 */
async function addToCart(duckId, quantity) {
  hideError('add-to-cart-error');
  const successEl = document.getElementById('add-to-cart-success');
  if (successEl) {
    successEl.classList.add('hidden');
    successEl.textContent = '';
  }

  try {
    await fetchAPI('POST', '/api/cart/items', { duckId, quantity });
    await refreshCartCount();
    if (successEl) {
      successEl.textContent = '✓ Added to cart!';
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 2500);
    }
  } catch (err) {
    showError('add-to-cart-error', friendlyError(err));
  }
}

// ─── Cart View ─────────────────────────────────────────────────────────────────
async function loadCart() {
  showView('cart');
  hideError('cart-error');
  const content = document.getElementById('cart-content');
  const footer = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total-amount');
  content.innerHTML = '<p class="loading">Loading cart…</p>';
  footer.classList.add('hidden');

  try {
    const data = await fetchAPI('GET', '/api/cart');
    const items = data.items || [];
    const total = data.cartTotal || 0;

    if (items.length === 0) {
      content.innerHTML =
        '<p class="empty-state">Your cart is empty. <br>Browse the catalog to find your duck!</p>';
      return;
    }

    content.innerHTML = `
      <ul class="cart-list">
        ${items
          .map(
            (item) => `
          <li class="cart-item">
            <span class="cart-item-emoji">🦆</span>
            <div class="cart-item-info">
              <strong>${esc(item.name)}</strong>
              <span>$${Number(item.unitPrice).toFixed(2)} each</span>
            </div>
            <div class="cart-item-controls">
              <button class="qty-btn minus-btn"
                      data-id="${item.duckId}"
                      data-qty="${item.quantity - 1}"
                      aria-label="Decrease quantity of ${esc(item.name)}">−</button>
              <span class="cart-qty">${item.quantity}</span>
              <button class="qty-btn plus-btn"
                      data-id="${item.duckId}"
                      data-qty="${item.quantity + 1}"
                      aria-label="Increase quantity of ${esc(item.name)}">+</button>
            </div>
            <span class="cart-item-total">$${Number(item.lineTotal).toFixed(2)}</span>
            <button class="remove-btn"
                    data-id="${item.duckId}"
                    aria-label="Remove ${esc(item.name)} from cart">✕</button>
          </li>
        `,
          )
          .join('')}
      </ul>
    `;

    footer.classList.remove('hidden');
    totalEl.textContent = `$${Number(total).toFixed(2)}`;

    // Quantity decrease (PATCH if qty > 0, DELETE if qty reaches 0)
    content.querySelectorAll('.minus-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const duckId = Number(btn.dataset.id);
        const newQty = Number(btn.dataset.qty);
        hideError('cart-error');
        try {
          if (newQty <= 0) {
            await fetchAPI('DELETE', `/api/cart/items/${duckId}`);
          } else {
            await fetchAPI('PATCH', `/api/cart/items/${duckId}`, { quantity: newQty });
          }
          await loadCart();
          await refreshCartCount();
        } catch (err) {
          showError('cart-error', friendlyError(err));
        }
      });
    });

    // Quantity increase (PATCH)
    content.querySelectorAll('.plus-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const duckId = Number(btn.dataset.id);
        const newQty = Number(btn.dataset.qty);
        hideError('cart-error');
        try {
          await fetchAPI('PATCH', `/api/cart/items/${duckId}`, { quantity: newQty });
          await loadCart();
          await refreshCartCount();
        } catch (err) {
          showError('cart-error', friendlyError(err));
        }
      });
    });

    // Remove button (DELETE)
    content.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const duckId = Number(btn.dataset.id);
        hideError('cart-error');
        try {
          await fetchAPI('DELETE', `/api/cart/items/${duckId}`);
          await loadCart();
          await refreshCartCount();
        } catch (err) {
          showError('cart-error', friendlyError(err));
        }
      });
    });
  } catch (err) {
    content.innerHTML = '';
    showError('cart-error', friendlyError(err));
  }
}

// ─── Checkout View ─────────────────────────────────────────────────────────────
function loadCheckout() {
  showView('checkout');
  hideError('checkout-error');
  document.getElementById('checkout-form').reset();
}

/**
 * Handles checkout form submission.
 *
 * @param {SubmitEvent} e
 */
async function handleCheckoutSubmit(e) {
  e.preventDefault();
  hideError('checkout-error');
  const btn = document.getElementById('submit-checkout');
  btn.disabled = true;
  btn.textContent = 'Placing order…';

  try {
    const fd = new FormData(e.target);
    const body = {
      shippingName: fd.get('shippingName'),
      email: fd.get('email'),
      shippingAddress: fd.get('shippingAddress'),
      cardString: fd.get('cardString'),
    };

    const data = await fetchAPI('POST', '/api/checkout', body);
    renderOrderConfirmation(data.order);
    await refreshCartCount();
  } catch (err) {
    showError('checkout-error', friendlyError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place Order 🦆';
  }
}

// ─── Order Confirmation View ───────────────────────────────────────────────────
/**
 * Renders the order confirmation screen.
 *
 * @param {object} order  Order record returned by the checkout API
 */
function renderOrderConfirmation(order) {
  showView('order-confirmation');
  const content = document.getElementById('confirmation-content');
  const items = order.items || [];

  content.innerHTML = `
    <div class="order-id">Order ID: <code>${esc(order.id)}</code></div>
    <ul class="order-items">
      ${items
        .map(
          (item) => `
        <li class="order-item">
          <span class="order-item-name">${esc(item.name)}</span>
          <span class="order-item-qty">× ${item.quantity}</span>
          <span class="order-item-price">$${(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
        </li>
      `,
        )
        .join('')}
    </ul>
    <div class="order-total">Total: <strong>$${Number(order.total).toFixed(2)}</strong></div>
    <div class="order-date">Placed: ${new Date(order.createdAt).toLocaleString()}</div>
  `;
}

// ─── Duck of the Day View ──────────────────────────────────────────────────────
async function loadDuckOfTheDay() {
  showView('duck-of-the-day');
  hideError('dotd-error');
  const content = document.getElementById('dotd-content');
  content.innerHTML = '<p class="loading">Loading Duck of the Day…</p>';

  try {
    const data = await fetchAPI('GET', '/api/duck-of-the-day');

    if (!data.duck) {
      content.innerHTML = `
        <div class="dotd-empty">
          <p>${esc(data.message || 'No Duck of the Day today. Check back tomorrow!')}</p>
        </div>
      `;
      return;
    }

    const duck = data.duck;
    content.innerHTML = `
      <div class="dotd-banner">
        <div class="dotd-emoji">🦆✨</div>
        <h2>${esc(duck.name)}</h2>
        <span class="duck-category">${esc(duck.category)}</span>
        <p class="duck-tagline" style="margin:10px 0">${esc(duck.tagline)}</p>
        <p class="duck-price-large">$${Number(duck.price).toFixed(2)}</p>
        <span class="duck-stock ${stockClass(duck.stockLabel)}">${esc(duck.stockLabel)}</span>
        <br><br>
        <button class="btn-secondary dotd-detail-btn" data-id="${duck.id}">View Full Details</button>
      </div>
    `;

    content.querySelector('.dotd-detail-btn').addEventListener('click', () => {
      loadDuckDetail(duck.id);
    });
  } catch (err) {
    content.innerHTML = '';
    showError('dotd-error', friendlyError(err));
  }
}

// ─── Quiz View ─────────────────────────────────────────────────────────────────
/** Cached questions from GET /api/quiz */
let quizQuestions = [];

async function loadQuiz() {
  showView('quiz');
  hideError('quiz-error');
  quizQuestions = [];
  const content = document.getElementById('quiz-content');
  content.innerHTML = '<p class="loading">Loading quiz questions…</p>';

  try {
    const data = await fetchAPI('GET', '/api/quiz');
    quizQuestions = data.questions || [];
    renderQuizForm(content);
  } catch (err) {
    content.innerHTML = '';
    showError('quiz-error', friendlyError(err));
  }
}

/**
 * Renders the quiz question form into the given container element.
 *
 * @param {HTMLElement} container
 */
function renderQuizForm(container) {
  container.innerHTML = `
    <form id="quiz-form">
      ${quizQuestions
        .map(
          (q) => `
        <div class="quiz-question" id="question-${q.index}">
          <p class="question-text">${q.index + 1}. ${esc(q.text)}</p>
          <div class="quiz-choices">
            ${q.choices
              .map(
                (c) => `
              <label class="quiz-choice">
                <input type="radio" name="q${q.index}" value="${c.index}" required>
                <span>${esc(c.text)}</span>
              </label>
            `,
              )
              .join('')}
          </div>
        </div>
      `,
        )
        .join('')}
      <button type="submit" class="btn-primary quiz-submit-btn">Find My Duck! 🦆</button>
    </form>
    <div id="quiz-result" class="quiz-result hidden" aria-live="polite"></div>
  `;

  container.querySelector('#quiz-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('quiz-error');
    await handleQuizSubmit(e.target);
  });
}

/**
 * Collects answers from the quiz form and submits them to the API.
 *
 * @param {HTMLFormElement} form
 */
async function handleQuizSubmit(form) {
  const answers = [];

  for (const q of quizQuestions) {
    const radio = form.querySelector(`input[name="q${q.index}"]:checked`);
    if (!radio) {
      showError('quiz-error', `Please answer question ${q.index + 1} before submitting.`);
      document.getElementById(`question-${q.index}`)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    answers.push({ questionIndex: q.index, choiceIndex: Number(radio.value) });
  }

  const submitBtn = form.querySelector('.quiz-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Calculating…';

  try {
    const data = await fetchAPI('POST', '/api/quiz', { answers });
    renderQuizResult(data);
  } catch (err) {
    showError('quiz-error', friendlyError(err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Find My Duck! 🦆';
  }
}

/**
 * Renders the quiz result into the #quiz-result element.
 *
 * @param {object} data  Response data from POST /api/quiz
 */
function renderQuizResult(data) {
  const resultEl = document.getElementById('quiz-result');
  if (!resultEl) return;

  const duck = data.duck;
  resultEl.innerHTML = `
    <h2>You're a ${esc(data.recommendedCategory)} duck! 🎉</h2>
    <p class="quiz-message">${esc(data.message || '')}</p>
    ${
      duck
        ? `
      <div class="quiz-duck-card">
        <div class="duck-emoji">🦆</div>
        <h3>${esc(duck.name)}</h3>
        <p>${esc(duck.tagline)}</p>
        <span class="duck-stock ${stockClass(duck.stockLabel)}">${esc(duck.stockLabel)}</span>
        <p style="margin-top:6px;font-weight:700">$${Number(duck.price).toFixed(2)}</p>
        <button class="btn-secondary quiz-duck-detail-btn" data-id="${duck.id}">
          View Details
        </button>
      </div>
    `
        : '<p style="margin:12px 0;color:var(--color-text-muted)">No ducks currently available in this category.</p>'
    }
    <button class="btn-ghost retake-quiz-btn" style="margin-top:12px">Retake Quiz</button>
  `;

  resultEl.classList.remove('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth' });

  if (duck) {
    resultEl.querySelector('.quiz-duck-detail-btn').addEventListener('click', () => {
      loadDuckDetail(duck.id);
    });
  }

  resultEl.querySelector('.retake-quiz-btn').addEventListener('click', () => {
    loadQuiz();
  });
}

// ─── Initialisation ────────────────────────────────────────────────────────────
function init() {
  // Navigation
  document.getElementById('logo-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('catalog');
    loadCatalog();
  });

  document.getElementById('nav-catalog').addEventListener('click', () => {
    showView('catalog');
    loadCatalog(getCurrentFilters());
  });

  document.getElementById('nav-cart').addEventListener('click', () => {
    loadCart();
  });

  document.getElementById('nav-quiz').addEventListener('click', () => {
    loadQuiz();
  });

  document.getElementById('nav-dotd').addEventListener('click', () => {
    loadDuckOfTheDay();
  });

  // Back buttons
  document.getElementById('back-to-catalog').addEventListener('click', () => {
    showView('catalog');
    loadCatalog(getCurrentFilters());
  });

  document.getElementById('back-to-cart').addEventListener('click', () => {
    loadCart();
  });

  // Catalog filter controls
  document.getElementById('apply-filters').addEventListener('click', () => {
    loadCatalog(getCurrentFilters());
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    loadCatalog();
  });

  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadCatalog(getCurrentFilters());
  });

  // Cart → Checkout flow
  document.getElementById('checkout-btn').addEventListener('click', () => {
    loadCheckout();
  });

  document.getElementById('checkout-form').addEventListener('submit', handleCheckoutSubmit);

  document.getElementById('back-to-cart').addEventListener('click', () => {
    loadCart();
  });

  // Order confirmation → continue shopping
  document.getElementById('continue-shopping').addEventListener('click', () => {
    showView('catalog');
    loadCatalog();
  });

  // Initial load
  loadCatalog();
  refreshCartCount();
}

// Defer until DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
