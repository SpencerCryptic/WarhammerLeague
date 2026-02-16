/**
 * Cryptic Cabin — Collection Hero Banner Enhancer
 *
 * Dynamic hero banner for TCG collection pages with:
 *   - Latest set info (name, release date, card count) + Pre-order/Buy button
 *   - Featured cards from popular decks (cross-referenced with shop inventory)
 *   - Game-specific accent colours
 *
 * Restricted to:
 *   /collections/magic-single
 *   /collections/flesh-and-blood-single
 *   /collections/yugioh-single
 *
 * Load via Shopify theme.liquid:
 *   <script src="https://leagues.crypticcabin.com/js/collection-hero-enhancer.js" defer></script>
 */

(function () {
  'use strict';

  if (window.__ccHeroEnhancerLoaded) return;
  window.__ccHeroEnhancerLoaded = true;

  // ── Collection config ─────────────────────────────────────────────

  // Official game logos (must have transparent backgrounds for brightness/invert filter)
  var LOGO_MTG = 'https://www.icomedia.eu/wp-content/uploads/2021/03/MTG_Primary_LL_2c_Black_LG_V12-1.png';

  var COLLECTIONS = {
    'magic-single':            { game: 'mtg',    accent: '#F97316', label: 'Magic: The Gathering', logo: LOGO_MTG, description: 'Browse our collection of Magic: The Gathering singles — from Standard staples and Commander all-stars to rare collectibles.' },
    'magic-singles':           { game: 'mtg',    accent: '#F97316', label: 'Magic: The Gathering', logo: LOGO_MTG, description: 'Browse our collection of Magic: The Gathering singles — from Standard staples and Commander all-stars to rare collectibles.' },
    'flesh-and-blood-single':  { game: 'fab',    accent: '#DC2626', label: 'Flesh and Blood', logo: null, description: 'Browse our collection of Flesh and Blood singles — heroes, equipment, and action cards from all sets.' },
    'flesh-and-blood-singles': { game: 'fab',    accent: '#DC2626', label: 'Flesh and Blood', logo: null, description: 'Browse our collection of Flesh and Blood singles — heroes, equipment, and action cards from all sets.' },
    'yugioh-single':           { game: 'yugioh', accent: '#7C3AED', label: 'Yu-Gi-Oh!', logo: null, description: 'Browse our collection of Yu-Gi-Oh! singles — monsters, spells, and traps for every deck and format.' },
    'yugioh-singles':          { game: 'yugioh', accent: '#7C3AED', label: 'Yu-Gi-Oh!', logo: null, description: 'Browse our collection of Yu-Gi-Oh! singles — monsters, spells, and traps for every deck and format.' }
  };

  var API_BASE = 'https://leagues.crypticcabin.com/api/game-data';

  // ── Helpers ────────────────────────────────────────────────────────

  function getCollectionHandle() {
    var m = window.location.pathname.match(/\/collections\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function getCollectionTitle() {
    var h1 = document.querySelector('.collection-hero__title, .collection-banner__heading, h1.title, h1');
    if (h1 && h1.closest('.cc-collection-hero')) return null;
    return h1;
  }

  function getCollectionDescription() {
    return document.querySelector('.collection-hero__description, .collection-banner__text, .rte.collection-description, .collection__description');
  }

  function getCollectionImage() {
    return document.querySelector('.collection-hero__image img, .collection-banner__image img, .collection__image img');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    // Strip time component if present (e.g. "2025-09-26T00:00:00.000Z" → "2025-09-26")
    var dateOnly = dateStr.split('T')[0];
    var d = new Date(dateOnly + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // ── Fetch game data from API ──────────────────────────────────────

  function fetchGameData(game, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '?game=' + game, true);
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { callback(JSON.parse(xhr.responseText)); } catch (e) { callback(null); }
      } else {
        callback(null);
      }
    };
    xhr.onerror = xhr.ontimeout = function () { callback(null); };
    xhr.send();
  }

  // ── Build hero banner ─────────────────────────────────────────────

  function buildHero() {
    if (document.querySelector('.cc-collection-hero')) return;

    var handle = getCollectionHandle();
    if (!handle) return;

    var config = COLLECTIONS[handle];
    if (!config) return; // not one of our 3 collections

    var titleEl = getCollectionTitle();
    var descEl = getCollectionDescription();
    var imgEl = getCollectionImage();

    var title = titleEl ? titleEl.textContent.trim() : '';
    var desc = descEl ? descEl.textContent.trim() : '';
    var imgSrc = imgEl ? imgEl.src : null;

    // Fallback to config label if Shopify title not found
    if (!title) title = config.label + ' Singles';

    // ── Container (full-bleed) ──
    var hero = document.createElement('div');
    hero.className = 'cc-collection-hero';
    hero.style.setProperty('--cc-hero-accent', config.accent);

    // Inner wrapper (centered content)
    var inner = document.createElement('div');
    inner.className = 'cc-hero__inner';

    // Watermark
    if (imgSrc) {
      var watermark = document.createElement('div');
      watermark.className = 'cc-hero__watermark';
      watermark.style.backgroundImage = 'url(' + imgSrc + ')';
      inner.appendChild(watermark);
    }

    // ── Top row: info + latest set ──
    var topRow = document.createElement('div');
    topRow.className = 'cc-hero__top';

    // Left: logo + title + description
    var info = document.createElement('div');
    info.className = 'cc-hero__info';

    // Title row with game logo
    var titleRow = document.createElement('div');
    titleRow.className = 'cc-hero__title-row';

    if (config.logo) {
      var logoImg = document.createElement('img');
      logoImg.className = 'cc-hero__logo';
      logoImg.src = config.logo;
      logoImg.alt = config.label + ' logo';
      // Hide logo gracefully if it fails to load (hotlink blocked, 404, etc.)
      logoImg.onerror = function () { this.style.display = 'none'; };
      titleRow.appendChild(logoImg);
    }

    var h = document.createElement('h1');
    h.className = 'cc-hero__title';
    h.textContent = title;
    titleRow.appendChild(h);

    info.appendChild(titleRow);

    // Show description — always use config description so it's guaranteed visible
    if (config.description) {
      var descP = document.createElement('p');
      descP.className = 'cc-hero__desc';
      descP.textContent = config.description;
      info.appendChild(descP);
    }

    topRow.appendChild(info);

    // Right: latest set card (populated async)
    var setCard = document.createElement('div');
    setCard.className = 'cc-hero__set-card';
    setCard.style.display = 'none';
    topRow.appendChild(setCard);

    inner.appendChild(topRow);

    // ── Featured cards strip (populated async) ──
    var featuredSection = document.createElement('div');
    featuredSection.className = 'cc-hero__featured';
    featuredSection.style.display = 'none';
    inner.appendChild(featuredSection);

    hero.appendChild(inner);

    // ── Insert into page — at the TOP of main content ──
    // The hero replaces the Shopify collection title/description section.
    // It must go at the very top, before filters, featured cards, product grid.
    var main = document.querySelector('#MainContent, main, .main-content, [role="main"]');
    if (main) {
      main.insertBefore(hero, main.firstChild);
    } else {
      // Absolute fallback — insert before the product grid area
      var fallback = document.querySelector('.facets-block-wrapper, .product-grid');
      if (fallback && fallback.parentNode) {
        fallback.parentNode.insertBefore(hero, fallback);
      }
    }

    // ── Hide original Shopify collection title/description section ──
    // Find the Shopify section that contains the h1 (not our hero) and hide it
    if (titleEl && !titleEl.closest('.cc-collection-hero')) {
      // Walk up to the nearest Shopify section wrapper
      var shopifySection = titleEl.closest('[id^="shopify-section"], .shopify-section, section.collection-hero, .collection-hero, .collection-banner');
      if (shopifySection && !shopifySection.closest('.cc-collection-hero')) {
        shopifySection.style.display = 'none';
      } else {
        // Fallback: hide individual elements
        titleEl.style.display = 'none';
        if (descEl && !descEl.closest('.cc-collection-hero')) {
          descEl.style.display = 'none';
        }
      }
    }
    if (imgEl && !imgEl.closest('.cc-collection-hero')) {
      var imgSection = imgEl.closest('[id^="shopify-section"], .shopify-section, .collection-hero, .collection-banner, .banner');
      if (imgSection && !imgSection.closest('.cc-collection-hero')) {
        imgSection.style.display = 'none';
      }
    }

    // ── Fetch and populate dynamic data ──
    fetchGameData(config.game, function (data) {
      if (!data) return;

      // Latest set
      if (data.latestSet) {
        populateSetCard(setCard, data.latestSet, handle);
      }

      // Featured cards — only show cards that have a real shop link
      if (data.featuredCards && data.featuredCards.length > 0) {
        var linkedCards = data.featuredCards.filter(function (c) {
          return c.shopUrl && c.shopUrl !== '#';
        });
        if (linkedCards.length > 0) {
          populateFeatured(featuredSection, linkedCards);
        }
      }
    });
  }

  // ── Populate latest set card ──────────────────────────────────────

  function populateSetCard(container, set, handle) {
    var today = new Date().toISOString().slice(0, 10);
    var relDate = (set.releaseDate || '').split('T')[0];
    var isPreorder = relDate > today;

    var label = document.createElement('span');
    label.className = 'cc-hero__set-label';
    label.textContent = isPreorder ? 'COMING SOON' : 'LATEST SET';
    container.appendChild(label);

    var name = document.createElement('span');
    name.className = 'cc-hero__set-name';
    name.textContent = set.name;
    container.appendChild(name);

    var meta = document.createElement('span');
    meta.className = 'cc-hero__set-meta';
    var parts = [];
    if (set.cardCount) parts.push(set.cardCount + ' cards');
    var dateFormatted = formatDate(set.releaseDate);
    if (dateFormatted) parts.push(dateFormatted);
    if (parts.length > 0) {
      meta.textContent = parts.join(' \u00b7 ');
      container.appendChild(meta);
    }

    var btn = document.createElement('a');
    btn.className = 'cc-hero__set-btn';
    btn.textContent = isPreorder ? 'Pre-order \u2192' : 'Browse Set \u2192';
    btn.href = '/collections/' + handle + '?set=' + encodeURIComponent(set.code);
    container.appendChild(btn);

    container.style.display = '';
  }

  // ── Populate featured cards strip ─────────────────────────────────

  function populateFeatured(container, cards) {
    var heading = document.createElement('span');
    heading.className = 'cc-hero__featured-heading';
    heading.textContent = 'Trending Cards';
    container.appendChild(heading);

    var strip = document.createElement('div');
    strip.className = 'cc-hero__featured-strip';

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var item = document.createElement('a');
      item.className = 'cc-hero__featured-card';
      item.href = card.shopUrl || '#';

      if (card.imageUrl) {
        var img = document.createElement('img');
        img.src = card.imageUrl;
        img.alt = card.name;
        img.loading = 'lazy';
        item.appendChild(img);
      }

      var cardInfo = document.createElement('div');
      cardInfo.className = 'cc-hero__featured-info';

      var cardName = document.createElement('span');
      cardName.className = 'cc-hero__featured-name';
      cardName.textContent = card.name;
      cardInfo.appendChild(cardName);

      if (card.price != null) {
        var price = document.createElement('span');
        price.className = 'cc-hero__featured-price';
        price.textContent = '\u00a3' + card.price.toFixed(2);
        cardInfo.appendChild(price);
      }

      item.appendChild(cardInfo);
      strip.appendChild(item);
    }

    container.appendChild(strip);
    container.style.display = '';
  }

  // ── Styles ────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cc-hero-enhancer-css')) return;
    var style = document.createElement('style');
    style.id = 'cc-hero-enhancer-css';
    style.textContent = [
      // ── Full-bleed hero container ──
      '.cc-collection-hero {',
      '  position: relative;',
      '  z-index: 3;',
      '  background: #14171f;',
      '  border: none;',
      '  border-radius: 0;',
      '  padding: 0;',
      '  margin: 0;',
      '  overflow: hidden;',
      '}',

      // ── Accent gradient top edge ──
      '.cc-collection-hero::before {',
      '  content: "";',
      '  position: absolute;',
      '  left: 0; top: 0; right: 0;',
      '  height: 3px;',
      '  background: linear-gradient(90deg, var(--cc-hero-accent, #F97316), transparent);',
      '}',

      // ── Inner content wrapper (centered) ──
      '.cc-hero__inner {',
      '  max-width: var(--page-width, 1200px);',
      '  margin: 0 auto;',
      '  padding: 32px 32px 28px;',
      '  position: relative;',
      '}',

      // ── Watermark ──
      '.cc-hero__watermark {',
      '  position: absolute;',
      '  right: 20px; top: 50%;',
      '  transform: translateY(-50%);',
      '  width: 280px; height: 280px;',
      '  background-size: contain;',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '  opacity: 0.04;',
      '  pointer-events: none;',
      '}',

      // ── Top row ──
      '.cc-hero__top {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: flex-start;',
      '  gap: 32px;',
      '  position: relative;',
      '  z-index: 1;',
      '}',
      '.cc-hero__info { flex: 1; min-width: 0; }',

      // ── Title row with logo ──
      '.cc-hero__title-row {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 16px;',
      '  margin-bottom: 10px;',
      '}',
      '.cc-hero__logo {',
      '  height: 44px;',
      '  width: auto;',
      '  max-width: 180px;',
      '  flex-shrink: 0;',
      '  object-fit: contain;',
      '  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4)) brightness(0) invert(1);',
      '}',

      // ── Title ──
      '.cc-hero__title {',
      '  font-size: 30px;',
      '  font-weight: 700;',
      '  color: #fff;',
      '  margin: 0;',
      '  line-height: 1.15;',
      '  letter-spacing: -0.02em;',
      '}',

      // ── Description ──
      '.cc-hero__desc {',
      '  font-size: 14px;',
      '  line-height: 1.5;',
      '  color: rgba(255,255,255,0.45);',
      '  margin: 0;',
      '  max-width: 520px;',
      '}',

      // ── Latest set card ──
      '.cc-hero__set-card {',
      '  flex-shrink: 0;',
      '  background: rgba(255,255,255,0.05);',
      '  border: 1px solid rgba(255,255,255,0.10);',
      '  border-radius: 12px;',
      '  padding: 16px 20px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 6px;',
      '  min-width: 220px;',
      '  max-width: 280px;',
      '  backdrop-filter: blur(8px);',
      '}',
      '.cc-hero__set-label {',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.1em;',
      '  text-transform: uppercase;',
      '  color: var(--cc-hero-accent, #F97316);',
      '}',
      '.cc-hero__set-name {',
      '  font-size: 18px;',
      '  font-weight: 600;',
      '  color: #fff;',
      '  line-height: 1.25;',
      '}',
      '.cc-hero__set-meta {',
      '  font-size: 12px;',
      '  color: rgba(255,255,255,0.45);',
      '}',
      '.cc-hero__set-btn {',
      '  display: inline-block;',
      '  margin-top: 8px;',
      '  padding: 9px 20px;',
      '  background: var(--cc-hero-accent, #F97316);',
      '  color: #fff;',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '  border-radius: 8px;',
      '  text-decoration: none;',
      '  text-align: center;',
      '  transition: opacity 0.15s ease, transform 0.1s ease;',
      '}',
      '.cc-hero__set-btn:hover {',
      '  opacity: 0.9;',
      '  transform: translateY(-1px);',
      '}',

      // ── Featured cards ──
      '.cc-hero__featured {',
      '  margin-top: 24px;',
      '  padding-top: 20px;',
      '  border-top: 1px solid rgba(255,255,255,0.06);',
      '  position: relative;',
      '  z-index: 1;',
      '}',
      '.cc-hero__featured-heading {',
      '  display: block;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.08em;',
      '  color: rgba(255,255,255,0.35);',
      '  margin-bottom: 14px;',
      '}',
      '.cc-hero__featured-strip {',
      '  display: flex;',
      '  gap: 16px;',
      '  overflow-x: auto;',
      '  scroll-snap-type: x mandatory;',
      '  -webkit-overflow-scrolling: touch;',
      '  padding-bottom: 6px;',
      '}',
      '.cc-hero__featured-strip::-webkit-scrollbar { height: 4px; }',
      '.cc-hero__featured-strip::-webkit-scrollbar-track { background: transparent; }',
      '.cc-hero__featured-strip::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.12);',
      '  border-radius: 2px;',
      '}',
      '.cc-hero__featured-card {',
      '  flex: 1 0 0;',
      '  min-width: 0;',
      '  scroll-snap-align: start;',
      '  text-decoration: none;',
      '  transition: transform 0.12s ease;',
      '}',
      '.cc-hero__featured-card:hover { transform: translateY(-4px); }',
      '.cc-hero__featured-card img {',
      '  width: 100%;',
      '  height: auto;',
      '  border-radius: 8px;',
      '  display: block;',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.4);',
      '}',
      '.cc-hero__featured-info {',
      '  padding: 6px 2px 0;',
      '}',
      '.cc-hero__featured-name {',
      '  display: block;',
      '  font-size: 12px;',
      '  font-weight: 500;',
      '  color: rgba(255,255,255,0.70);',
      '  line-height: 1.3;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      '.cc-hero__featured-price {',
      '  display: block;',
      '  font-size: 13px;',
      '  font-weight: 700;',
      '  color: var(--cc-hero-accent, #F97316);',
      '}',

      // ── Bottom accent line ──
      '.cc-collection-hero::after {',
      '  content: "";',
      '  position: absolute;',
      '  left: 0; bottom: 0; right: 0;',
      '  height: 1px;',
      '  background: rgba(255,255,255,0.06);',
      '}',

      // ── Mobile ──
      '@media screen and (max-width: 749px) {',
      '  .cc-hero__inner {',
      '    padding: 24px 16px 20px;',
      '  }',
      '  .cc-hero__top {',
      '    flex-direction: column;',
      '    gap: 16px;',
      '  }',
      '  .cc-hero__logo { height: 32px; max-width: 140px; }',
      '  .cc-hero__title-row { gap: 12px; }',
      '  .cc-hero__title { font-size: 22px; }',
      '  .cc-hero__desc { font-size: 13px; }',
      '  .cc-hero__set-card {',
      '    max-width: 100%;',
      '    min-width: 0;',
      '    flex-direction: row;',
      '    flex-wrap: wrap;',
      '    align-items: center;',
      '    gap: 6px 14px;',
      '  }',
      '  .cc-hero__set-label { order: 1; }',
      '  .cc-hero__set-name { order: 2; flex: 1; }',
      '  .cc-hero__set-meta { order: 3; width: 100%; }',
      '  .cc-hero__set-btn { order: 4; }',
      '  .cc-hero__watermark {',
      '    width: 120px; height: 120px;',
      '    right: 0; opacity: 0.04;',
      '  }',
      '  .cc-collection-hero {',
      '    overflow: hidden;',
      '    max-width: 100vw;',
      '  }',
      '  .cc-hero__inner {',
      '    max-width: 100%;',
      '    overflow: hidden;',
      '  }',
      '  .cc-hero__featured {',
      '    overflow: hidden;',
      '    max-width: 100%;',
      '  }',
      '  .cc-hero__featured-strip {',
      '    gap: 10px;',
      '    max-width: 100%;',
      '    overflow-x: auto;',
      '    scroll-snap-type: x mandatory;',
      '    -webkit-overflow-scrolling: touch;',
      '  }',
      '  .cc-hero__featured-card {',
      '    flex: 0 0 100px;',
      '  }',
      '  .cc-hero__featured-card img {',
      '    border-radius: 6px;',
      '  }',
      '  .cc-hero__featured-name {',
      '    font-size: 10px;',
      '  }',
      '  .cc-hero__featured-price {',
      '    font-size: 11px;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Init ──────────────────────────────────────────────────────────

  function init() {
    var handle = getCollectionHandle();
    if (!handle || !COLLECTIONS[handle]) return;

    injectStyles();
    buildHero();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
