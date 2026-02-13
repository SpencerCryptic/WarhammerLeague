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

  var COLLECTIONS = {
    'magic-single':            { game: 'mtg',    accent: '#F97316', label: 'Magic: The Gathering' },
    'magic-singles':           { game: 'mtg',    accent: '#F97316', label: 'Magic: The Gathering' },
    'flesh-and-blood-single':  { game: 'fab',    accent: '#DC2626', label: 'Flesh and Blood' },
    'flesh-and-blood-singles': { game: 'fab',    accent: '#DC2626', label: 'Flesh and Blood' },
    'yugioh-single':           { game: 'yugioh', accent: '#7C3AED', label: 'Yu-Gi-Oh!' },
    'yugioh-singles':          { game: 'yugioh', accent: '#7C3AED', label: 'Yu-Gi-Oh!' }
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
    var d = new Date(dateStr + 'T00:00:00');
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

    if (!title) return;

    // ── Container ──
    var hero = document.createElement('div');
    hero.className = 'cc-collection-hero';
    hero.style.setProperty('--cc-hero-accent', config.accent);

    // Watermark
    if (imgSrc) {
      var watermark = document.createElement('div');
      watermark.className = 'cc-hero__watermark';
      watermark.style.backgroundImage = 'url(' + imgSrc + ')';
      hero.appendChild(watermark);
    }

    // ── Top row: info + latest set ──
    var topRow = document.createElement('div');
    topRow.className = 'cc-hero__top';

    // Left: title + description
    var info = document.createElement('div');
    info.className = 'cc-hero__info';

    var h = document.createElement('h1');
    h.className = 'cc-hero__title';
    h.textContent = title;
    info.appendChild(h);

    if (desc) {
      var p = document.createElement('p');
      p.className = 'cc-hero__desc';
      p.textContent = desc;
      info.appendChild(p);
    }

    topRow.appendChild(info);

    // Right: latest set card (populated async)
    var setCard = document.createElement('div');
    setCard.className = 'cc-hero__set-card';
    setCard.style.display = 'none';
    topRow.appendChild(setCard);

    hero.appendChild(topRow);

    // ── Featured cards strip (populated async) ──
    var featuredSection = document.createElement('div');
    featuredSection.className = 'cc-hero__featured';
    featuredSection.style.display = 'none';
    hero.appendChild(featuredSection);

    // ── Insert into page ──
    var insertBefore = document.querySelector('.facets-block-wrapper')
      || document.querySelector('.facets-controls-wrapper')
      || document.querySelector('.product-grid');

    if (insertBefore && insertBefore.parentNode) {
      insertBefore.parentNode.insertBefore(hero, insertBefore);
    } else {
      var main = document.querySelector('main, .main-content, #MainContent');
      if (main && main.firstChild) {
        main.insertBefore(hero, main.firstChild);
      }
    }

    // Hide originals
    if (titleEl && !titleEl.closest('.cc-collection-hero')) {
      titleEl.style.display = 'none';
    }
    if (descEl && !descEl.closest('.cc-collection-hero')) {
      descEl.style.display = 'none';
    }
    if (imgEl) {
      var imgSection = imgEl.closest('.collection-hero, .collection-banner, .collection-hero-section, .banner');
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

      // Featured cards
      if (data.featuredCards && data.featuredCards.length > 0) {
        populateFeatured(featuredSection, data.featuredCards);
      }
    });
  }

  // ── Populate latest set card ──────────────────────────────────────

  function populateSetCard(container, set, handle) {
    var today = new Date().toISOString().slice(0, 10);
    var isPreorder = set.releaseDate > today;

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
    if (set.releaseDate) parts.push(formatDate(set.releaseDate));
    meta.textContent = parts.join(' \u00b7 ');
    container.appendChild(meta);

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
    heading.textContent = 'Popular Right Now';
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
      // ── Hero container ──
      '.cc-collection-hero {',
      '  position: relative;',
      '  background: linear-gradient(135deg, #1a1d2e 0%, #202330 50%, #1a1d2e 100%);',
      '  border: 1px solid rgba(255,255,255,0.08);',
      '  border-radius: 14px;',
      '  padding: 28px 32px;',
      '  margin: 16px auto 0;',
      '  max-width: var(--page-width, 1200px);',
      '  overflow: hidden;',
      '}',

      // ── Accent glow left edge ──
      '.cc-collection-hero::before {',
      '  content: "";',
      '  position: absolute;',
      '  left: 0; top: 0; bottom: 0;',
      '  width: 3px;',
      '  background: var(--cc-hero-accent, #F97316);',
      '  border-radius: 14px 0 0 14px;',
      '}',

      // ── Watermark ──
      '.cc-hero__watermark {',
      '  position: absolute;',
      '  right: -20px; top: 50%;',
      '  transform: translateY(-50%);',
      '  width: 220px; height: 220px;',
      '  background-size: contain;',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '  opacity: 0.06;',
      '  pointer-events: none;',
      '}',

      // ── Top row ──
      '.cc-hero__top {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: flex-start;',
      '  gap: 24px;',
      '  position: relative;',
      '  z-index: 1;',
      '}',
      '.cc-hero__info { flex: 1; min-width: 0; }',

      // ── Title ──
      '.cc-hero__title {',
      '  font-size: 26px;',
      '  font-weight: 700;',
      '  color: #fff;',
      '  margin: 0 0 6px 0;',
      '  line-height: 1.2;',
      '  letter-spacing: -0.02em;',
      '  border-bottom: 3px solid var(--cc-hero-accent, #F97316);',
      '  padding-bottom: 6px;',
      '  display: inline-block;',
      '}',

      // ── Description ──
      '.cc-hero__desc {',
      '  font-size: 13px;',
      '  line-height: 1.5;',
      '  color: rgba(255,255,255,0.50);',
      '  margin: 0;',
      '  max-width: 480px;',
      '}',

      // ── Latest set card ──
      '.cc-hero__set-card {',
      '  flex-shrink: 0;',
      '  background: rgba(255,255,255,0.04);',
      '  border: 1px solid rgba(255,255,255,0.10);',
      '  border-radius: 10px;',
      '  padding: 14px 18px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 4px;',
      '  min-width: 200px;',
      '  max-width: 260px;',
      '}',
      '.cc-hero__set-label {',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.08em;',
      '  text-transform: uppercase;',
      '  color: var(--cc-hero-accent, #F97316);',
      '}',
      '.cc-hero__set-name {',
      '  font-size: 16px;',
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
      '  margin-top: 6px;',
      '  padding: 7px 16px;',
      '  background: var(--cc-hero-accent, #F97316);',
      '  color: #fff;',
      '  font-size: 13px;',
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
      '  margin-top: 18px;',
      '  padding-top: 16px;',
      '  border-top: 1px solid rgba(255,255,255,0.06);',
      '  position: relative;',
      '  z-index: 1;',
      '}',
      '.cc-hero__featured-heading {',
      '  display: block;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.06em;',
      '  color: rgba(255,255,255,0.40);',
      '  margin-bottom: 10px;',
      '}',
      '.cc-hero__featured-strip {',
      '  display: flex;',
      '  gap: 12px;',
      '  overflow-x: auto;',
      '  scroll-snap-type: x mandatory;',
      '  -webkit-overflow-scrolling: touch;',
      '  padding-bottom: 4px;',
      '}',
      '.cc-hero__featured-strip::-webkit-scrollbar { height: 4px; }',
      '.cc-hero__featured-strip::-webkit-scrollbar-track { background: transparent; }',
      '.cc-hero__featured-strip::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.12);',
      '  border-radius: 2px;',
      '}',
      '.cc-hero__featured-card {',
      '  flex-shrink: 0;',
      '  scroll-snap-align: start;',
      '  width: 110px;',
      '  text-decoration: none;',
      '  transition: transform 0.12s ease;',
      '}',
      '.cc-hero__featured-card:hover { transform: translateY(-3px); }',
      '.cc-hero__featured-card img {',
      '  width: 110px;',
      '  height: auto;',
      '  border-radius: 6px;',
      '  display: block;',
      '}',
      '.cc-hero__featured-info {',
      '  padding: 4px 0;',
      '}',
      '.cc-hero__featured-name {',
      '  display: block;',
      '  font-size: 11px;',
      '  font-weight: 500;',
      '  color: rgba(255,255,255,0.70);',
      '  line-height: 1.25;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      '.cc-hero__featured-price {',
      '  display: block;',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '  color: var(--cc-hero-accent, #F97316);',
      '}',

      // ── Mobile ──
      '@media screen and (max-width: 749px) {',
      '  .cc-collection-hero {',
      '    padding: 20px 16px;',
      '    margin: 12px 12px 0;',
      '    border-radius: 12px;',
      '  }',
      '  .cc-hero__top {',
      '    flex-direction: column;',
      '    gap: 14px;',
      '  }',
      '  .cc-hero__title { font-size: 20px; }',
      '  .cc-hero__desc { font-size: 12px; }',
      '  .cc-hero__set-card {',
      '    max-width: 100%;',
      '    min-width: 0;',
      '    flex-direction: row;',
      '    flex-wrap: wrap;',
      '    align-items: center;',
      '    gap: 4px 12px;',
      '  }',
      '  .cc-hero__set-label { order: 1; }',
      '  .cc-hero__set-name { order: 2; flex: 1; }',
      '  .cc-hero__set-meta { order: 3; width: 100%; }',
      '  .cc-hero__set-btn { order: 4; }',
      '  .cc-hero__watermark {',
      '    width: 100px; height: 100px;',
      '    right: -10px; opacity: 0.05;',
      '  }',
      '  .cc-hero__featured-card { width: 90px; }',
      '  .cc-hero__featured-card img { width: 90px; }',
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
