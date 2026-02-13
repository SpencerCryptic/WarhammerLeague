/**
 * Cryptic Cabin — Product Card Enhancer
 *
 * Parses TCG product titles and restructures them for clean display.
 * Works across all collections: Magic, Flesh and Blood, Yu-Gi-Oh.
 *
 * Title format: "Card Name - Set Name (Rarity) [SET-123]"
 * Enhanced:     Card Name         (bold, white)
 *               Set Name · Rarity (small, muted)
 *
 * Handles edge cases like "Card (V.1 - Rare) - Set (Rarity) [CODE]"
 * by using greedy matching for the card name portion.
 *
 * Load via Shopify theme.liquid:
 *   <script src="https://leagues.crypticcabin.com/js/product-card-enhancer.js" defer></script>
 */

(function () {
  'use strict';

  // Prevent double-initialization
  if (window.__ccCardEnhancerLoaded) return;
  window.__ccCardEnhancerLoaded = true;

  // ── Title parser ───────────────────────────────────────────────────

  /**
   * Parse a TCG product title into components.
   *
   * Supported formats:
   *   "Card Name - Set Name (Rarity) [SET-123]"
   *   "Card Name - Set Name (Rarity)"
   *
   * The greedy match for card name handles titles with dashes/parens
   * in the card name itself, e.g.:
   *   "Ryzeal Plasma Hole (V.1 - Rare) - Crossover Breakers (Rare) [CRBR-010]"
   *   → name: "Ryzeal Plasma Hole (V.1 - Rare)"
   *   → set:  "Crossover Breakers"
   *   → rarity: "Rare"
   */
  function parseTitle(title) {
    if (!title) return null;
    title = title.trim();

    // Full format: Card Name - Set Name (Rarity) [CODE]
    var m = title.match(/^(.+)\s+-\s+(.+?)\s+\(([^)]+)\)\s+\[([^\]]+)\]$/);
    if (m) return { name: m[1].trim(), set: m[2].trim(), rarity: m[3].trim(), code: m[4].trim() };

    // No code: Card Name - Set Name (Rarity)
    m = title.match(/^(.+)\s+-\s+(.+?)\s+\(([^)]+)\)$/);
    if (m) return { name: m[1].trim(), set: m[2].trim(), rarity: m[3].trim(), code: null };

    return null;
  }

  // ── FaB name cleanup ─────────────────────────────────────────────

  // FaB card names include pitch color + edition: "Card (Blue) (Regular)"
  // Strip these for a cleaner display name
  var FAB_SUFFIXES = /\s+\((Red|Blue|Yellow)\)\s*(\((Regular|Rainbow Foil|Cold Foil|Extended Art|Normal|Marvel|1st Edition)\))?$/i;

  function cleanFabName(name) {
    return name.replace(FAB_SUFFIXES, '');
  }

  // ── Card enhancement ───────────────────────────────────────────────

  function enhanceCard(card) {
    if (card.dataset.ccEnhanced) return;
    card.dataset.ccEnhanced = 'true';

    // Find the title text — Horizon theme structure:
    //   <a class="contents user-select-text" ref="productTitleLink">
    //     <div class="text-block ...">
    //       <p>Card Name - Set Name (Rarity) [CODE]</p>
    //     </div>
    //   </a>
    var titleLink = card.querySelector('a[ref="productTitleLink"], a.contents.user-select-text');
    var textBlock = titleLink && titleLink.querySelector('.text-block');
    var titleP = textBlock && textBlock.querySelector('p');
    if (!titleP) return;

    var parsed = parseTitle(titleP.textContent);
    if (!parsed) return;

    // Clean up FaB-style variant suffixes from the name
    var displayName = cleanFabName(parsed.name);

    // Restructure the <p> content
    titleP.textContent = '';
    titleP.classList.add('cc-enhanced-title');

    var nameEl = document.createElement('span');
    nameEl.className = 'cc-pname';
    nameEl.textContent = displayName;
    titleP.appendChild(nameEl);

    var metaEl = document.createElement('span');
    metaEl.className = 'cc-pmeta';
    metaEl.textContent = parsed.set;
    titleP.appendChild(metaEl);

    var rarityEl = document.createElement('span');
    rarityEl.className = 'cc-prarity';
    rarityEl.textContent = parsed.rarity;
    titleP.appendChild(rarityEl);

    // Also fix the zoom-out grid view title
    var zoomTitle = card.querySelector('.product-grid-view-zoom-out--details h3');
    if (zoomTitle) {
      var zoomParsed = parseTitle(zoomTitle.textContent);
      if (zoomParsed) zoomTitle.textContent = cleanFabName(zoomParsed.name);
    }
  }

  function enhanceAll() {
    var cards = document.querySelectorAll('product-card:not([data-cc-enhanced])');
    for (var i = 0; i < cards.length; i++) {
      enhanceCard(cards[i]);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cc-card-enhancer-css')) return;
    var style = document.createElement('style');
    style.id = 'cc-card-enhancer-css';
    style.textContent = [
      // ── Card container — dark bg, border, hover lift ──
      'product-card[data-cc-enhanced] .product-card__content {',
      '  background: #1F222E !important;',
      '  border: 1px solid rgba(255,255,255,0.08) !important;',
      '  border-radius: 10px !important;',
      '  overflow: hidden !important;',
      '  transition: transform 0.15s ease, box-shadow 0.15s ease !important;',
      '}',
      'product-card[data-cc-enhanced]:hover .product-card__content {',
      '  transform: translateY(-3px);',
      '  box-shadow: 0 8px 24px rgba(0,0,0,0.4);',
      '}',

      // ── Image area ──
      'product-card[data-cc-enhanced] .card-gallery {',
      '  border-radius: 0 !important;',
      '  border: none !important;',
      '}',

      // ── Title text ──
      '.cc-enhanced-title {',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  gap: 1px !important;',
      '}',
      '.cc-pname {',
      '  font-weight: 600;',
      '  font-size: 14px;',
      '  line-height: 1.3;',
      '  color: #fff !important;',
      '  display: -webkit-box;',
      '  -webkit-line-clamp: 2;',
      '  -webkit-box-orient: vertical;',
      '  overflow: hidden;',
      '}',
      '.cc-pmeta {',
      '  font-size: 12px;',
      '  font-weight: 400;',
      '  line-height: 1.35;',
      '  color: rgba(255,255,255,0.5) !important;',
      '  display: -webkit-box;',
      '  -webkit-line-clamp: 2;',
      '  -webkit-box-orient: vertical;',
      '  overflow: hidden;',
      '}',
      '.cc-prarity {',
      '  font-size: 11px;',
      '  font-weight: 500;',
      '  color: rgba(255,255,255,0.4) !important;',
      '}',

      // ── Orange price ──
      'product-card[data-cc-enhanced] product-price .price,',
      'product-card[data-cc-enhanced] product-price .price--on-sale,',
      'product-card[data-cc-enhanced] product-price [ref="priceContainer"] {',
      '  color: #F97316 !important;',
      '  font-weight: 700 !important;',
      '  font-size: 16px !important;',
      '}',
      // Dim the compare-at / was price
      'product-card[data-cc-enhanced] product-price .price--compare {',
      '  color: rgba(255,255,255,0.35) !important;',
      '  font-weight: 400 !important;',
      '  font-size: 13px !important;',
      '}',

      // ── Link color reset ──
      'a .cc-pname, a .cc-pmeta, a .cc-prarity {',
      '  text-decoration: none !important;',
      '}',
      'product-card[data-cc-enhanced] a.product-card__link {',
      '  text-decoration: none !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Init + observer ────────────────────────────────────────────────

  function init() {
    injectStyles();
    enhanceAll();

    // Watch for dynamically added cards (infinite scroll, AJAX nav)
    var observer = new MutationObserver(function (mutations) {
      var hasNew = false;
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1) {
            if ((node.matches && node.matches('product-card, li, results-list')) ||
                (node.querySelector && node.querySelector('product-card'))) {
              hasNew = true;
              break;
            }
          }
        }
        if (hasNew) break;
      }
      if (hasNew) requestAnimationFrame(enhanceAll);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
