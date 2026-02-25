/**
 * Cryptic Cabin — Collection Filters
 *
 * Bypasses Shopify's 5,000 product collection filter limit by fetching data
 * from the Netlify bulk-data API and rendering filters + product cards
 * client-side.
 *
 * Generates HTML using the SAME CSS classes as the Horizon theme's filters
 * (facets__panel, facets__summary, facets__input, etc.) so existing dark
 * theme CSS applies automatically.
 *
 * Config: set window.CrypticCabinFilters before this script loads.
 */

(function () {
  'use strict';

  // Prevent double-initialization (script may be included twice)
  if (window.__ccFiltersLoaded) return;
  window.__ccFiltersLoaded = true;

  // ── Config ───────────────────────────────────────────────────────

  const CONFIG = Object.assign({
    apiUrl: '/api/bulk-data/filtered',
    pageSize: 24,
    currency: 'GBP',
    currencySymbol: '\u00a3',
    debounceMs: 300,
  }, window.CrypticCabinFilters || {});

  // ── State ────────────────────────────────────────────────────────

  const state = {
    filters: {},
    sort: 'name',
    dir: 'asc',
    page: 1,
    facets: null,
    totalCards: 0,
    loading: false,
  };

  let abortController = null;
  const responseCache = new Map();
  const MAX_CACHE = 20;

  // ── DOM references ───────────────────────────────────────────────

  let filterContainer = null;
  let productGrid = null;
  let productCountEl = null;
  let paginationContainer = null;

  // ── Mobile fixed-position fix ───────────────────────────────────
  // Shopify themes may set transform/will-change/contain on ancestor
  // elements, which breaks position:fixed on filter panel content.
  // Walk up the DOM when a panel opens and neutralise those properties.

  let _savedAncestorStyles = [];
  const FIXED_BREAK_PROPS = ['transform', 'willChange', 'perspective', 'contain', 'filter'];
  const FIXED_SAFE_VALUES = {
    transform: 'none', willChange: 'auto', perspective: 'none', contain: 'none', filter: 'none'
  };

  function clearAncestorContainingBlocks(el) {
    _savedAncestorStyles = [];
    let node = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const overrides = {};
      let needsFix = false;
      for (const p of FIXED_BREAK_PROPS) {
        if (cs[p] && cs[p] !== FIXED_SAFE_VALUES[p]) {
          overrides[p] = node.style[p] || '';
          needsFix = true;
        }
      }
      if (needsFix) {
        _savedAncestorStyles.push({ node, overrides });
        for (const p in overrides) node.style[p] = FIXED_SAFE_VALUES[p];
      }
      node = node.parentElement;
    }
  }

  function restoreAncestorContainingBlocks() {
    for (const { node, overrides } of _savedAncestorStyles) {
      for (const p in overrides) node.style[p] = overrides[p];
    }
    _savedAncestorStyles = [];
  }

  function initMobileFixedFix() {
    filterContainer.querySelectorAll('.facets__panel').forEach(panel => {
      panel.addEventListener('toggle', () => {
        if (window.innerWidth >= 750) return;
        if (panel.open) {
          clearAncestorContainingBlocks(panel);
        } else {
          restoreAncestorContainingBlocks();
        }
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────────────

  // Collections where this script should activate
  const ALLOWED_COLLECTIONS = ['magic-single', 'magic-singles'];

  function getCollectionHandle() {
    const match = window.location.pathname.match(/\/collections\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function init() {
    // Only activate on allowed collections
    const handle = getCollectionHandle();
    if (!handle || !ALLOWED_COLLECTIONS.includes(handle)) {
      return;
    }

    console.log('[CrypticCabin] Init on collection:', handle);

    filterContainer = document.querySelector('.facets__overflow-list')
      || document.querySelector('.facets__filters-wrapper');
    productGrid = document.querySelector('.product-grid');

    if (!filterContainer || !productGrid) {
      console.warn('[CrypticCabin] Missing DOM — filter:', !!filterContainer, 'grid:', !!productGrid);
      return;
    }

    // Check if Shopify already rendered real filter panels (< 5k collection)
    const existingPanels = filterContainer.querySelectorAll('.facets__panel');
    const realFilters = Array.from(existingPanels).filter(
      panel => panel.querySelector('.facets__input[type="checkbox"], .facets__price')
    );
    if (realFilters.length > 0) return; // Shopify filters work, don't take over

    console.log('[CrypticCabin] Taking over filters for large collection');

    // Mark body so CSS can hide native Shopify elements anywhere in the DOM
    document.body.classList.add('cc-filters-active');

    // Inject card CSS
    injectStyles();

    // Hide native Shopify controls that we replace
    const formEl = filterContainer.closest('.facets__form');
    if (formEl) {
      formEl.classList.add('cc-takeover');
    }
    // Also mark wrapper for CSS-based hiding
    const blockWrapper = filterContainer.closest('.facets-block-wrapper');
    if (blockWrapper) blockWrapper.classList.add('cc-takeover');

    // Hide native Shopify pagination
    document.querySelectorAll('.pagination-wrapper, .pagination:not(.cc-pagination)')
      .forEach(el => el.style.display = 'none');

    // Disable Shopify's infinite scroll so it doesn't append native cards
    const resultsList = document.querySelector('results-list[infinite-scroll]');
    if (resultsList) {
      resultsList.removeAttribute('infinite-scroll');
      // Remove scroll listeners by replacing with a clone
      const clone = resultsList.cloneNode(false);
      while (resultsList.firstChild) clone.appendChild(resultsList.firstChild);
      resultsList.parentNode.replaceChild(clone, resultsList);
    }

    // Read initial state from URL
    readStateFromURL();

    // Build filter panels (empty, will populate after first API call)
    buildFilterUI();

    // Fix position:fixed on mobile by clearing ancestor containing blocks at runtime
    if (window.innerWidth < 750) {
      initMobileFixedFix();
    }

    // Find/create product count element
    productCountEl = document.querySelector('.products-count-wrapper span')
      || document.querySelector('.products-count-wrapper');

    // Find/create pagination
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'cc-pagination';
    productGrid.parentNode.insertBefore(paginationContainer, productGrid.nextSibling);

    // Initial fetch
    fetchAndRender();

    // Listen for back/forward navigation
    window.addEventListener('popstate', () => {
      readStateFromURL();
      fetchAndRender();
    });
  }

  // ── URL State ────────────────────────────────────────────────────

  const FILTER_KEYS = ['set', 'rarity', 'colors', 'card_type', 'cmc', 'keywords', 'q', 'finish', 'condition'];

  function readStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters = {};
    for (const key of FILTER_KEYS) {
      const val = params.get(key);
      if (val) state.filters[key] = val;
    }
    state.sort = params.get('sort') || 'name';
    state.dir = params.get('dir') || 'asc';
    state.page = Math.max(1, parseInt(params.get('page')) || 1);
  }

  function writeStateToURL() {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      if (state.filters[key]) params.set(key, state.filters[key]);
    }
    if (state.sort !== 'name') params.set('sort', state.sort);
    if (state.dir !== 'asc') params.set('dir', state.dir);
    if (state.page > 1) params.set('page', String(state.page));
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.pushState(null, '', url);
  }

  // ── API Client ───────────────────────────────────────────────────

  async function fetchFiltered() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(state.filters)) {
      if (v) params.set(k, v);
    }
    params.set('sort', state.sort);
    params.set('dir', state.dir);
    params.set('page', String(state.page));
    params.set('page_size', String(CONFIG.pageSize));
    params.set('facets', 'true');

    const cacheKey = params.toString();
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 30_000) {
      return cached.data;
    }

    const url = CONFIG.apiUrl + '?' + cacheKey;
    const res = await fetch(url, { signal: abortController.signal });
    if (!res.ok) throw new Error('API error: ' + res.status);
    const data = await res.json();

    // LRU cache
    if (responseCache.size >= MAX_CACHE) {
      const oldest = responseCache.keys().next().value;
      responseCache.delete(oldest);
    }
    responseCache.set(cacheKey, { data, time: Date.now() });

    return data;
  }

  // ── Main render loop ─────────────────────────────────────────────

  let debounceTimer = null;

  function onFilterChange() {
    state.page = 1;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      writeStateToURL();
      fetchAndRender();
    }, CONFIG.debounceMs);
  }

  async function fetchAndRender() {
    state.loading = true;
    showLoadingSkeleton();

    try {
      const data = await fetchFiltered();
      state.facets = data.facets;
      state.totalCards = data.total_cards;

      renderProducts(data.data);
      renderPagination(data);
      updateFacetCounts();
      updateProductCount();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('[CrypticCabin] Fetch error:', e);
      productGrid.innerHTML = '<li class="product-grid__item" style="grid-column:1/-1;text-align:center;padding:60px 20px;"><h3>Failed to load products</h3><p style="opacity:0.6">Please refresh the page</p></li>';
    } finally {
      state.loading = false;
    }
  }

  // ── Filter UI ────────────────────────────────────────────────────

  function buildFilterUI() {
    filterContainer.innerHTML = '';

    // Search
    filterContainer.appendChild(buildSearchPanel());

    // Rarity
    filterContainer.appendChild(buildCheckboxPanel('Rarity', 'rarity', []));

    // Set
    filterContainer.appendChild(buildCheckboxPanel('Set', 'set', [], true));

    // Colour
    filterContainer.appendChild(buildCheckboxPanel('Colour', 'colors', []));

    // Card Type
    filterContainer.appendChild(buildCheckboxPanel('Type', 'card_type', []));

    // CMC
    filterContainer.appendChild(buildCheckboxPanel('CMC', 'cmc', []));

    // Finish
    filterContainer.appendChild(buildCheckboxPanel('Finish', 'finish', []));

    // Keywords (searchable)
    filterContainer.appendChild(buildCheckboxPanel('Keywords', 'keywords', [], true));

    // Clear All button (hidden until filters are active)
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'cc-clear-all facets__summary';
    clearBtn.textContent = 'Clear All';
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', () => {
      state.filters = {};
      state.page = 1;
      writeStateToURL();
      buildFilterUI(); // Rebuild to reset checkboxes
      fetchAndRender();
    });
    filterContainer.appendChild(clearBtn);

    // Sort (after filters, outside overflow list if possible)
    const sortPanel = buildSortPanel();
    sortPanel.classList.add('cc-sort');
    const formParent = filterContainer.closest('.facets__form');
    if (formParent) {
      formParent.appendChild(sortPanel);
    } else {
      filterContainer.appendChild(sortPanel);
    }
  }

  function buildCheckboxPanel(label, filterKey, options, hasSearch) {
    const panel = document.createElement('details');
    panel.className = 'facets__panel facets__item';
    panel.dataset.filterName = filterKey;

    const summary = document.createElement('summary');
    summary.className = 'facets__summary';
    summary.innerHTML = '<span>' + label + '</span> ' + caretSVG();
    panel.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'facets__panel-content';

    if (hasSearch) {
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search ' + label.toLowerCase() + '...';
      searchInput.className = 'cc-facet-search';
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        const items = content.querySelectorAll('.facets__inputs-list li');
        items.forEach(li => {
          const text = li.textContent.toLowerCase();
          li.style.display = text.includes(q) ? '' : 'none';
        });
      });
      content.appendChild(searchInput);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'facets__inputs-wrapper';
    const list = document.createElement('ul');
    list.className = 'facets__inputs-list';
    list.dataset.filterKey = filterKey;
    wrapper.appendChild(list);
    content.appendChild(wrapper);

    panel.appendChild(content);
    return panel;
  }

  function buildSearchPanel() {
    const panel = document.createElement('div');
    panel.className = 'facets__item cc-search-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search cards...';
    input.className = 'facets__summary cc-search-input';
    input.value = state.filters.q || '';
    input.style.cssText = 'width:100%;cursor:text;';

    input.addEventListener('input', () => {
      if (input.value) {
        state.filters.q = input.value;
      } else {
        delete state.filters.q;
      }
      onFilterChange();
    });

    panel.appendChild(input);
    return panel;
  }

  function buildInStockPanel() {
    const panel = document.createElement('div');
    panel.className = 'facets__item cc-in-stock-item';

    const label = document.createElement('label');
    label.className = 'facets__summary';
    label.style.cssText = 'cursor:pointer;gap:8px;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'facets__input';
    checkbox.checked = state.filters.in_stock === 'true';
    checkbox.style.cssText = 'width:18px;height:18px;margin:0;';

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.filters.in_stock = 'true';
      } else {
        delete state.filters.in_stock;
      }
      onFilterChange();
    });

    const text = document.createElement('span');
    text.textContent = 'In Stock';

    const count = document.createElement('span');
    count.className = 'cc-facet-count';
    count.dataset.filterKey = 'in_stock';
    count.dataset.filterValue = 'true';

    label.appendChild(checkbox);
    label.appendChild(text);
    label.appendChild(count);
    panel.appendChild(label);
    return panel;
  }

  function buildPricePanel() {
    const panel = document.createElement('details');
    panel.className = 'facets__panel facets__item';
    panel.dataset.filterName = 'price';

    const summary = document.createElement('summary');
    summary.className = 'facets__summary';
    summary.innerHTML = '<span>Price</span> ' + caretSVG();
    panel.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'facets__panel-content';

    const priceDiv = document.createElement('div');
    priceDiv.className = 'facets__price facets__inputs';

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.className = 'facets__price-input';
    minInput.placeholder = CONFIG.currencySymbol + ' Min';
    minInput.min = '0';
    minInput.step = '0.01';
    minInput.value = state.filters.min_price || '';

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.className = 'facets__price-input';
    maxInput.placeholder = CONFIG.currencySymbol + ' Max';
    maxInput.min = '0';
    maxInput.step = '0.01';
    maxInput.value = state.filters.max_price || '';

    function onPriceChange() {
      if (minInput.value) state.filters.min_price = minInput.value;
      else delete state.filters.min_price;
      if (maxInput.value) state.filters.max_price = maxInput.value;
      else delete state.filters.max_price;
      onFilterChange();
    }

    minInput.addEventListener('change', onPriceChange);
    maxInput.addEventListener('change', onPriceChange);

    priceDiv.appendChild(minInput);
    priceDiv.appendChild(maxInput);
    content.appendChild(priceDiv);
    panel.appendChild(content);
    return panel;
  }

  function buildSortPanel() {
    const wrapper = document.createElement('div');
    wrapper.className = 'sorting-filter facets__item';

    const select = document.createElement('select');
    select.name = 'sort_by';
    select.className = 'facets__summary';
    select.style.cssText = 'cursor:pointer;';

    const options = [
      { value: 'name:asc', label: 'Name A\u2013Z' },
      { value: 'name:desc', label: 'Name Z\u2013A' },
      { value: 'price:asc', label: 'Price: Low to High' },
      { value: 'price:desc', label: 'Price: High to Low' },
      { value: 'set:asc', label: 'Set A\u2013Z' },
      { value: 'rarity:desc', label: 'Rarity: High to Low' },
      { value: 'cmc:asc', label: 'CMC: Low to High' },
    ];

    const current = state.sort + ':' + state.dir;
    for (const opt of options) {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.value === current) el.selected = true;
      select.appendChild(el);
    }

    select.addEventListener('change', () => {
      const [sort, dir] = select.value.split(':');
      state.sort = sort;
      state.dir = dir;
      state.page = 1;
      writeStateToURL();
      fetchAndRender();
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  // ── Facet count updates ──────────────────────────────────────────

  function updateFacetCounts() {
    if (!state.facets) return;

    // Update checkbox panels
    for (const key of ['rarity', 'set', 'colors', 'card_type', 'cmc', 'finish', 'keywords']) {
      const list = filterContainer.querySelector('[data-filter-key="' + key + '"]');
      if (!list || !state.facets[key]) continue;

      const facetItems = state.facets[key];
      list.innerHTML = '';

      const activeValues = (state.filters[key] || '').split(',').filter(Boolean);

      for (const item of facetItems) {
        const li = document.createElement('li');
        const label = document.createElement('label');
        label.className = 'facets__label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'facets__input';
        checkbox.value = item.value;
        checkbox.checked = activeValues.includes(item.value);
        checkbox.dataset.filterKey = key;

        checkbox.addEventListener('change', () => {
          updateFilterFromCheckboxes(key);
          onFilterChange();
        });

        const text = document.createElement('span');
        text.className = 'facets__label-text';
        text.textContent = item.label;

        const count = document.createElement('span');
        count.className = 'cc-facet-count';
        count.textContent = '(' + item.count + ')';

        label.appendChild(checkbox);
        label.appendChild(text);
        label.appendChild(count);
        li.appendChild(label);
        list.appendChild(li);
      }
    }

    // Mark active filter panels + update summary badges
    let totalActive = 0;
    filterContainer.querySelectorAll('.facets__panel').forEach(panel => {
      const key = panel.dataset.filterName;
      const summary = panel.querySelector('.facets__summary');
      if (!summary) return;

      // Remove any existing badge
      const oldBadge = summary.querySelector('.cc-active-badge');
      if (oldBadge) oldBadge.remove();

      if (key && state.filters[key]) {
        const count = state.filters[key].split(',').filter(Boolean).length;
        totalActive += count;
        panel.dataset.hasSelection = 'true';

        const badge = document.createElement('span');
        badge.className = 'cc-active-badge';
        badge.textContent = count;
        summary.appendChild(badge);
      } else {
        delete panel.dataset.hasSelection;
      }
    });

    // Show/hide Clear All button
    const clearBtn = filterContainer.querySelector('.cc-clear-all');
    if (clearBtn) {
      clearBtn.style.display = totalActive > 0 ? '' : 'none';
    }
  }

  function updateFilterFromCheckboxes(filterKey) {
    const checkboxes = filterContainer.querySelectorAll(
      'input[data-filter-key="' + filterKey + '"]:checked'
    );
    const values = Array.from(checkboxes).map(cb => cb.value);
    if (values.length > 0) {
      state.filters[filterKey] = values.join(',');
    } else {
      delete state.filters[filterKey];
    }
  }

  // ── Product count ────────────────────────────────────────────────

  function updateProductCount() {
    if (productCountEl) {
      productCountEl.textContent = state.totalCards + ' product' + (state.totalCards !== 1 ? 's' : '');
    }
  }

  // ── Product Grid ─────────────────────────────────────────────────

  function showLoadingSkeleton() {
    const skeletons = [];
    for (let i = 0; i < CONFIG.pageSize; i++) {
      skeletons.push('<li class="product-grid__item"><div class="cc-card cc-card--skeleton"><div class="cc-card__img-skeleton"></div><div class="cc-card__info-skeleton"><div class="cc-skel-line cc-skel-line--title"></div><div class="cc-skel-line cc-skel-line--sub"></div><div class="cc-skel-line cc-skel-line--price"></div></div></div></li>');
    }
    productGrid.innerHTML = skeletons.join('');
  }

  function renderProducts(cards) {
    if (cards.length === 0) {
      productGrid.innerHTML = '<li class="product-grid__item" style="grid-column:1/-1;text-align:center;padding:60px 20px;"><h3 style="margin-bottom:10px;font-size:24px;">No cards found</h3><p style="color:rgba(255,255,255,0.6)">Try adjusting your filters</p></li>';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const card of cards) {
      const li = document.createElement('li');
      li.className = 'product-grid__item';
      li.dataset.productId = card.cryptic_cabin?.product_id || '';

      const imgSrc = card.image_uris?.normal
        || card.image_uris?.small
        || card.cryptic_cabin?.url
        || '';

      // Handle double-faced cards
      const frontImg = card.card_faces?.[0]?.image_uris?.normal || imgSrc;

      const handle = card.cryptic_cabin?.handle || '';
      const price = card.cryptic_cabin?.price_gbp;
      const inStock = card.cryptic_cabin?.in_stock;
      const condition = card.cryptic_cabin?.condition || '';
      const finish = card.cryptic_cabin?.finish || '';
      const variantId = card.cryptic_cabin?.variant_id || '';

      const a = document.createElement('a');
      a.href = '/products/' + handle + (variantId ? '?variant=' + variantId : '');
      a.className = 'cc-card';

      const imgDiv = document.createElement('div');
      imgDiv.className = 'cc-card__media';

      const img = document.createElement('img');
      img.src = frontImg;
      img.alt = card.name || '';
      img.loading = 'lazy';
      img.width = 244;
      img.height = 340;
      imgDiv.appendChild(img);

      if (!inStock) {
        const badge = document.createElement('span');
        badge.className = 'cc-card__badge-sold-out';
        badge.textContent = 'Sold Out';
        imgDiv.appendChild(badge);
      }

      a.appendChild(imgDiv);

      const info = document.createElement('div');
      info.className = 'cc-card__info';

      const nameEl = document.createElement('span');
      nameEl.className = 'cc-card__name';
      nameEl.textContent = card.name || 'Unknown';
      info.appendChild(nameEl);

      const setEl = document.createElement('span');
      setEl.className = 'cc-card__set';
      var rawSet = card.set_name || card.set || '';
      var displaySet = rawSet.replace(/^Magic:\s*The Gathering\s*[-|:]?\s*/, '') || rawSet;
      setEl.textContent = displaySet + (card.rarity ? ' \u00b7 ' + card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) : '');
      info.appendChild(setEl);

      const priceRow = document.createElement('div');
      priceRow.className = 'cc-card__price-row';

      if (price != null) {
        const priceEl = document.createElement('span');
        priceEl.className = 'cc-card__price';
        priceEl.textContent = CONFIG.currencySymbol + price.toFixed(2);
        priceRow.appendChild(priceEl);
      }

      if (condition || finish) {
        const meta = document.createElement('span');
        meta.className = 'cc-card__meta';
        const parts = [];
        if (condition && condition !== 'NM') parts.push(condition);
        if (finish && finish !== 'nonfoil') parts.push(finish.charAt(0).toUpperCase() + finish.slice(1));
        if (parts.length) meta.textContent = parts.join(' \u00b7 ');
        priceRow.appendChild(meta);
      }

      info.appendChild(priceRow);
      a.appendChild(info);
      li.appendChild(a);
      fragment.appendChild(li);
    }

    productGrid.innerHTML = '';
    productGrid.appendChild(fragment);
  }

  // ── Pagination ───────────────────────────────────────────────────

  function renderPagination(data) {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(data.total_cards / data.page_size);
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    const nav = document.createElement('nav');
    nav.className = 'cc-pagination__nav';
    nav.setAttribute('aria-label', 'Pagination');

    // Previous
    if (state.page > 1) {
      nav.appendChild(pageButton('\u2190 Previous', state.page - 1));
    }

    // Page numbers (show up to 7 with ellipsis)
    const pages = paginationRange(state.page, totalPages);
    for (const p of pages) {
      if (p === '...') {
        const span = document.createElement('span');
        span.className = 'cc-pagination__ellipsis';
        span.textContent = '\u2026';
        nav.appendChild(span);
      } else {
        const btn = pageButton(String(p), p);
        if (p === state.page) {
          btn.classList.add('cc-pagination__btn--current');
          btn.setAttribute('aria-current', 'page');
        }
        nav.appendChild(btn);
      }
    }

    // Next
    if (state.page < totalPages) {
      nav.appendChild(pageButton('Next \u2192', state.page + 1));
    }

    paginationContainer.innerHTML = '';
    paginationContainer.appendChild(nav);
  }

  function pageButton(label, page) {
    const btn = document.createElement('button');
    btn.className = 'cc-pagination__btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      state.page = page;
      writeStateToURL();
      fetchAndRender();
      window.scrollTo({ top: productGrid.offsetTop - 100, behavior: 'smooth' });
    });
    return btn;
  }

  function paginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  // ── SVG helper ───────────────────────────────────────────────────

  function caretSVG() {
    return '<svg class="icon-caret" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="8"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ── Injected CSS ─────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cc-filter-styles')) return;

    const style = document.createElement('style');
    style.id = 'cc-filter-styles';
    style.textContent = `
      /* ── Search input ── */
      .cc-search-input {
        background: var(--filter-input-bg, rgba(255,255,255,0.06)) !important;
        border: 1px solid var(--filter-border, rgba(255,255,255,0.18)) !important;
        color: var(--filter-text, #fff) !important;
        font-size: 14px;
      }
      .cc-search-input:focus {
        border-color: var(--filter-accent, #F97316) !important;
        outline: none;
      }
      .cc-search-input::placeholder { color: rgba(255,255,255,0.4); }

      /* ── Facet search inside panels ── */
      .cc-facet-search {
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 8px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.04);
        color: #fff;
        font-size: 14px;
      }
      .cc-facet-search:focus {
        border-color: var(--filter-accent, #F97316);
        outline: none;
      }
      .cc-facet-search::placeholder { color: rgba(255,255,255,0.4); }

      /* ── Facet count badge ── */
      .cc-facet-count {
        margin-left: auto;
        font-size: 12px;
        color: rgba(255,255,255,0.45);
        font-weight: 400;
      }

      /* ── Product cards ── */
      .cc-card {
        display: block;
        text-decoration: none;
        color: inherit;
        border-radius: 10px;
        overflow: hidden;
        background: var(--filter-bg-darker, #1F222E);
        border: 1px solid rgba(255,255,255,0.08);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .cc-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      .cc-card__media {
        position: relative;
        aspect-ratio: 488/680;
        overflow: hidden;
        background: rgba(255,255,255,0.03);
      }
      .cc-card__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .cc-card__badge-sold-out {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0,0,0,0.75);
        color: rgba(255,255,255,0.8);
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cc-card__info {
        padding: 10px 12px 12px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .cc-card__name {
        font-weight: 600;
        font-size: 14px;
        line-height: 1.3;
        color: #fff;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .cc-card__set {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cc-card__price-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-top: 4px;
      }
      .cc-card__price {
        font-weight: 700;
        font-size: 16px;
        color: var(--filter-accent, #F97316);
      }
      .cc-card__meta {
        font-size: 11px;
        color: rgba(255,255,255,0.4);
        text-transform: capitalize;
      }

      /* ── Skeleton loading ── */
      .cc-card--skeleton {
        border-radius: 10px;
        overflow: hidden;
        background: var(--filter-bg-darker, #1F222E);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .cc-card__img-skeleton {
        aspect-ratio: 488/680;
        background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
        background-size: 200% 100%;
        animation: cc-shimmer 1.5s infinite;
      }
      .cc-card__info-skeleton {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cc-skel-line {
        height: 12px;
        border-radius: 4px;
        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
        background-size: 200% 100%;
        animation: cc-shimmer 1.5s infinite;
      }
      .cc-skel-line--title { width: 80%; height: 14px; }
      .cc-skel-line--sub { width: 60%; }
      .cc-skel-line--price { width: 40%; height: 16px; }
      @keyframes cc-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* ── Pagination ── */
      .cc-pagination {
        margin: 32px 0 48px;
      }
      .cc-pagination__nav {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .cc-pagination__btn {
        background: var(--filter-input-bg, rgba(255,255,255,0.06));
        border: 1px solid var(--filter-border, rgba(255,255,255,0.18));
        border-radius: 8px;
        padding: 8px 14px;
        color: var(--filter-text, #fff);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s, transform 0.08s;
      }
      .cc-pagination__btn:hover {
        background: rgba(249,115,22,0.18);
        border-color: var(--filter-accent, #F97316);
        transform: translateY(-1px);
      }
      .cc-pagination__btn--current {
        background: var(--filter-accent, #F97316) !important;
        border-color: var(--filter-accent, #F97316) !important;
        color: #fff !important;
      }
      .cc-pagination__ellipsis {
        padding: 8px 4px;
        color: rgba(255,255,255,0.4);
      }

      /* ── Active filter state ── */
      .facets__panel[data-has-selection="true"] > .facets__summary {
        background: var(--filter-accent, #F97316) !important;
        border-color: var(--filter-accent, #F97316) !important;
        color: #fff !important;
      }
      .facets__panel[data-has-selection="true"] > .facets__summary::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #fff;
        flex-shrink: 0;
      }

      /* ── Active count badge ── */
      .cc-active-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        background: rgba(255,255,255,0.25);
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        margin-left: 4px;
      }

      /* ── Clear All button ── */
      .cc-clear-all {
        background: rgba(239,68,68,0.15) !important;
        border-color: rgba(239,68,68,0.4) !important;
        color: #ef4444 !important;
        cursor: pointer;
        font-weight: 500;
      }
      .cc-clear-all:hover {
        background: rgba(239,68,68,0.25) !important;
        border-color: #ef4444 !important;
      }

      /* ── Hide Shopify elements we replace ── */
      .cc-takeover sorting-filter-component,
      .cc-takeover .column-options-wrapper,
      .cc-takeover .facets__actions,
      .cc-takeover .facets-remove { display: none !important; }

      /* Sort component may live outside .cc-takeover wrapper */
      body.cc-filters-active sorting-filter-component,
      body.cc-filters-active .column-options-wrapper { display: none !important; }

      /* Hide native Shopify pagination when we take over */
      body.cc-filters-active .pagination-wrapper,
      body.cc-filters-active .pagination:not(.cc-pagination) { display: none !important; }

      /* Hide native Shopify product cards — only our API cards should show */
      body.cc-filters-active .product-grid__item:has(product-card) { display: none !important; }
      body.cc-filters-active product-card { display: none !important; }

      /* ── Mobile responsive ── */
      @media (max-width: 749px) {
        /* Prevent horizontal overflow on the whole page */
        body.cc-filters-active {
          overflow-x: hidden !important;
        }
        body.cc-filters-active .section-template--collection,
        body.cc-filters-active [class*="section-template"] {
          overflow-x: hidden !important;
        }

        /* ── Fix position:fixed – clear ancestor containing blocks ──
           Shopify themes often set transform/will-change/contain on
           wrappers which traps fixed-position filter panel content. */
        body.cc-filters-active .facets-block-wrapper,
        body.cc-filters-active facets-form-component,
        body.cc-filters-active .facets__form-wrapper,
        body.cc-filters-active .facets--horizontal,
        body.cc-filters-active .facets--vertical,
        body.cc-filters-active .facets__form,
        body.cc-filters-active .facets__filters-wrapper,
        body.cc-filters-active .facets__overflow-list,
        body.cc-filters-active .facets__item,
        body.cc-filters-active .facets__panel,
        body.cc-filters-active .collection .grid,
        body.cc-filters-active [class*="collection"] > .grid,
        body.cc-filters-active .page-width > .grid,
        body.cc-filters-active .shopify-section,
        body.cc-filters-active [class*="section-template"] {
          transform: none !important;
          will-change: auto !important;
          perspective: none !important;
          contain: none !important;
        }

        /* Force Shopify's collection page layout to single column
           (theme may use a sidebar grid e.g. 1fr 3fr) */
        body.cc-filters-active .collection .grid,
        body.cc-filters-active .collection-product-list,
        body.cc-filters-active .facets-container,
        body.cc-filters-active [class*="collection"] > .grid,
        body.cc-filters-active .page-width > .grid,
        body.cc-filters-active .main-collection .grid {
          display: block !important;
          grid-template-columns: 1fr !important;
        }

        /* All grid children must be full width */
        body.cc-filters-active .collection .grid > *,
        body.cc-filters-active [class*="collection"] > .grid > *,
        body.cc-filters-active .page-width > .grid > * {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        /* Filter container: 2-column grid, full width, proper padding */
        body.cc-filters-active .facets__overflow-list,
        body.cc-filters-active .facets__filters-wrapper {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 16px !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }

        /* Form wrapper constraints */
        body.cc-filters-active .facets__form,
        body.cc-filters-active .facets-block-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
          padding: 0 !important;
        }

        /* Each filter item must stay within bounds */
        body.cc-filters-active .facets__item {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        /* Search spans full width */
        body.cc-filters-active .cc-search-item {
          grid-column: 1 / -1 !important;
        }

        /* Sort spans full width */
        body.cc-filters-active .cc-sort {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          padding: 0 16px !important;
          box-sizing: border-box !important;
        }
        body.cc-filters-active .cc-sort select {
          width: 100% !important;
        }

        /* Clear all spans full width */
        body.cc-filters-active .cc-clear-all {
          grid-column: 1 / -1 !important;
        }

        /* Summary buttons: truncate text, ensure they fit */
        body.cc-filters-active .facets__summary {
          font-size: 13px !important;
          padding: 10px 12px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          min-width: 0 !important;
        }

        /* Filter dropdown panels: full viewport width overlay */
        body.cc-filters-active .facets__panel[open] .facets__panel-content {
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          top: auto !important;
          max-height: 60vh !important;
          overflow-y: auto !important;
          z-index: 999 !important;
          background: var(--filter-bg-darker, #1a1d2e) !important;
          border-top: 2px solid var(--filter-accent, #F97316) !important;
          padding: 16px !important;
          box-shadow: 0 -8px 30px rgba(0,0,0,0.5) !important;
          border-radius: 16px 16px 0 0 !important;
        }

        /* Backdrop when panel is open */
        body.cc-filters-active .facets__panel[open]::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 998;
        }

        /* Checkbox list inside mobile drawer */
        body.cc-filters-active .facets__panel[open] .facets__inputs-wrapper {
          max-height: 45vh !important;
          overflow-y: auto !important;
        }

        body.cc-filters-active .facets__panel[open] .facets__inputs-list li {
          padding: 6px 0 !important;
        }

        body.cc-filters-active .facets__panel[open] .facets__label {
          font-size: 15px !important;
          padding: 8px 4px !important;
          gap: 10px !important;
        }

        body.cc-filters-active .facets__panel[open] .facets__input {
          width: 20px !important;
          height: 20px !important;
        }

        /* Product grid: 2 columns with proper spacing */
        body.cc-filters-active .product-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 10px !important;
          padding: 0 12px !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        body.cc-filters-active .product-grid__item {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        /* Smaller card text on mobile */
        .cc-card__name {
          font-size: 12px !important;
        }
        .cc-card__set {
          font-size: 10px !important;
        }
        .cc-card__price {
          font-size: 14px !important;
        }
        .cc-card__info {
          padding: 8px 8px 10px !important;
        }

        /* Pagination: compact on mobile */
        .cc-pagination__btn {
          padding: 6px 10px !important;
          font-size: 13px !important;
        }
        .cc-pagination__nav {
          gap: 4px !important;
        }
        .cc-pagination {
          margin: 24px 12px 40px !important;
        }

        /* Collection page wrapper */
        body.cc-filters-active .collection,
        body.cc-filters-active .main-collection {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }
      }

      /* ── Small mobile (< 400px): single column filters ── */
      @media (max-width: 399px) {
        body.cc-filters-active .facets__overflow-list,
        body.cc-filters-active .facets__filters-wrapper {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Bootstrap ────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
