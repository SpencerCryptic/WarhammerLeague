# Fixed `filters.liquid`

Copy everything below this line and paste into your Shopify theme editor, replacing the entire contents of `filters.liquid`.

---

```liquid
{%- doc -%}
  Renders the facet filtering component

  @param {object} results - The search results object
  @param {number} results_size - The number of products in the search results
  @param {object} [filters] - The filters object
{%- enddoc -%}

<script
  src="{{ 'facets.js' | asset_url }}"
  type="module"
  fetchpriority="low"
></script>

{%- liquid
  assign block_settings = block.settings
  assign products_count = results_size
  assign sort_by = results.sort_by | default: results.default_sort_by
  assign filters = filters | default: results.filters
  assign total_active_values = 0

  # Calculate facets margin style
  capture facets_margin_style
    echo '--facets-margin: 0px '
    if block_settings.filter_style == 'vertical'
      echo block_settings.facets_margin_right | append: 'px' | append: ' 0px'
    else
      echo ' 0px ' | append: block_settings.facets_margin_bottom | append: 'px'
    endif
    echo ' 0px;'
  endcapture

  for filter in filters
    case filter.type
      when 'price_range'
        if filter.min_value.value != null or filter.max_value.value != null
          assign total_active_values = total_active_values | plus: 1
        endif
      when 'boolean'
        if filter.active_values[0].value
          assign total_active_values = total_active_values | plus: 1
        endif
      else
        assign active_value_count = filter.active_values | size
        assign total_active_values = total_active_values | plus: active_value_count
    endcase
  endfor

  if results.url
    assign results_url = results.url
  else
    assign terms = results.terms | escape
    assign results_url = '?q=' | append: terms | append: '&options%5Bprefix%5D=last&sort_by=' | append: sort_by
  endif

  assign is_active = false
  assign should_show_pane = true
  if block_settings.filter_style == 'vertical'
    assign should_show_pane = block_settings.enable_filtering
  endif

  assign should_show_vertical_clear_all = true
  if block_settings.filter_style == 'vertical'
    assign should_show_vertical_clear_all = false
  endif
-%}

{% if block_settings.enable_filtering or block_settings.enable_sorting or block_settings.enable_grid_density %}
  {% if block_settings.filter_style == 'vertical' %}
    {%- comment -%}
      Vertical style still supported on desktop.
      These controls always render in a horizontal bar, hence .facets--horizontal.
    {%- endcomment -%}
    <div
      class="facets facets--horizontal facets-controls-wrapper spacing-style"
      style="{% render 'spacing-style', settings: block_settings %}{% if block_settings.text_label_case == 'uppercase' %} --facet-label-transform: uppercase;{% endif %}"
    >
      {% if block_settings.enable_filtering %}
        <h4 class="facets--filters-title">{{ 'content.filters' | t }}</h4>
      {% endif %}

      <div class="products-count-wrapper">
        <span title="{{ 'content.product_count' | t }}">
          {{- 'content.item_count' | t: count: products_count -}}
        </span>
      </div>

      {% if block_settings.enable_sorting %}
        {% render 'sorting',
          results: results,
          sort_by: sort_by,
          filter_style: block_settings.filter_style,
          suffix: 'desktop',
          sort_position: 'desktop',
          should_use_select_on_mobile: false,
          section_id: section.id
        %}
      {% endif %}

      {% if block_settings.enable_grid_density %}
        {% render 'grid-density-controls', viewport: 'desktop' %}
      {% endif %}
    </div>
  {% endif %}

  <div
    class="
      {% if should_show_pane == false %}
        hidden
      {% endif %}
      facets-block-wrapper
      facets-block-wrapper--{{ block_settings.filter_style }}
      {%- if block_settings.inherit_color_scheme == false %} color-{{ block_settings.color_scheme }}{% endif %}
      {%- if block_settings.filter_width == 'full-width' %} facets-block-wrapper--full-width{% endif %}
    "
    style="
      --grid-column--desktop:
        {%- if block_settings.filter_style == 'horizontal' -%}
          var(--{{ block_settings.filter_width }})
        {%- else -%}
          2 / var(--facets-vertical-col-width)
        {%- endif -%};
      {{ facets_margin_style }}
      --facets-inner-padding-block: {{ block_settings.padding-block-start }}px {{ block_settings.padding-block-end }}px;
      --facets-inner-padding-inline: var(--padding-lg);
    "
    {{ block.shopify_attributes }}
  >
    <div
      class="facets facets--{{ block_settings.filter_style }} spacing-style"
      style="{% render 'spacing-style', settings: block_settings %}{% if block_settings.text_label_case == 'uppercase' %} --facet-label-transform: uppercase;{% endif %}"
      aria-label="{{ 'accessibility.filters' | t }}"
    >
      <facets-form-component
        class="facets__form-wrapper"
        section-id="{{ section.id }}"
        form-style="{{ block_settings.filter_style }}"
      >
        <form
          action="{{ results_url }}"
          id="FacetFiltersForm--{{ section.id }}-desktop"
          class="facets__form"
          ref="facetsForm"
        >
          {% if should_show_pane %}
            {% render 'filter-remove-buttons',
              filters: filters,
              results_url: results_url,
              show_filter_label: block_settings.show_filter_label,
              should_show_clear_all: true
            %}

            {% if block_settings.enable_filtering %}
              {% assign total_active_values = 0 %}

              {% capture rendered_filters %}
                {%- for filter in filters -%}
                  {% case filter.type %}
                    {% when 'price_range' %}
                      {% if filter.min_value.value != null or filter.max_value.value != null %}
                        {% assign total_active_values = total_active_values | plus: 1 %}
                        {% assign is_active = true %}
                      {% endif %}

                      {% if block_settings.filter_style != 'vertical' %}
                        {% assign should_render_clear = true %}
                      {% else %}
                        {% assign should_render_clear = false %}
                      {% endif %}

                      {% render 'price-filter',
                        filter: filter,
                        filter_style: block_settings.filter_style,
                        should_render_clear: should_render_clear
                      %}

                    {% else %}
                      {% if filter.active_values.size > 0 %}
                        {% assign is_active = true %}
                      {% endif %}

                      {% assign active_value_count = filter.active_values | size %}
                      {% assign total_active_values = total_active_values | plus: active_value_count %}

                      {% if block_settings.filter_style != 'vertical' %}
                        {% assign should_render_clear = true %}
                      {% else %}
                        {% assign should_render_clear = false %}
                      {% endif %}

                      {% render 'list-filter',
                        filter: filter,
                        filter_style: block_settings.filter_style,
                        active_value_count: active_value_count,
                        should_render_clear: should_render_clear,
                        show_swatch_label: block_settings.show_swatch_label,
                        sectionId: section.id
                      %}
                  {% endcase %}
                {%- endfor -%}
              {% endcapture %}

              <div class="facets__filters-wrapper">
                {% if block_settings.filter_style == 'horizontal' %}
                  <div class="facets__overflow-list">
                    {{ rendered_filters }}
                  </div>
                {% else %}
                  {{ rendered_filters }}
                {% endif %}
              </div>

              {% render 'facets-actions',
                results_url: results_url,
                is_active: is_active,
                products_count: products_count,
                should_show_clear_all: should_show_vertical_clear_all
              %}
            {% endif %}

            {% if block_settings.filter_style == 'horizontal' %}
              <div class="products-count-wrapper">
                <span title="{{ 'content.product_count' | t }}">
                  {{- 'content.item_count' | t: count: products_count -}}
                </span>
              </div>

              {% if block_settings.enable_sorting %}
                {% render 'sorting',
                  results: results,
                  sort_by: sort_by,
                  filter_style: block_settings.filter_style,
                  suffix: 'desktop',
                  sort_position: 'desktop',
                  should_use_select_on_mobile: false,
                  section_id: section.id
                %}
              {% endif %}

              {% if block_settings.enable_grid_density %}
                {% render 'grid-density-controls', viewport: 'desktop' %}
              {% endif %}
            {% endif %}
          {% endif %}
        </form>
      </facets-form-component>
    </div>
  </div>
{% else %}
  <div></div>
{% endif %}

{% stylesheet %}
/* ==========================================================================
   Dark Themed Collection Filters – Desktop + Mobile
   ========================================================================== */

:root {
  --filter-bg-dark: #202330;
  --filter-bg-darker: #181b25;
  --filter-accent: #f97316;
  --filter-accent-hover: #fb923c;
  --filter-border: rgba(255, 255, 255, 0.16);
  --filter-pill-bg: rgba(255, 255, 255, 0.04);
  --filter-pill-bg-hover: rgba(249, 115, 22, 0.18);
  --filter-text: #ffffff;
  --filter-text-muted: rgba(255, 255, 255, 0.72);
}

/* Grid column for vertical layout */
.collection-wrapper {
  @media screen and (min-width: 750px) {
    --facets-vertical-col-width: 6;
  }
  @media screen and (min-width: 990px) {
    --facets-vertical-col-width: 5;
  }
}

/* Main wrapper */
.facets-block-wrapper {
  background: var(--filter-bg-dark);
  border-radius: 14px;
  border: 1px solid var(--filter-border);
  margin-block: 16px;
  padding: 12px 14px;

  @media screen and (min-width: 750px) {
    margin: var(--facets-margin);
    grid-column: var(--grid-column--desktop);
    padding: 16px 22px;
  }
}

.facets-block-wrapper--vertical {
  @media screen and (min-width: 750px) {
    grid-column: var(--grid-column--desktop);
  }
}

/* Core facets container */
.facets {
  --facets-horizontal-max-input-wrapper-height: 230px;
  --facets-upper-z-index: var(--layer-raised);
  --facets-open-z-index: var(--layer-heightened);
  --facets-low-opacity: 10%;
  --facets-hover-opacity: 75%;
  padding-block: 0;
  box-shadow: none;

  @media screen and (min-width: 750px) {
    padding-inline: var(--padding-inline-start) var(--padding-inline-end);
  }
}

.facets--horizontal {
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media screen and (min-width: 750px) {
    flex-direction: row;
    align-items: center;
    gap: 18px;
    position: relative;
    z-index: var(--facets-upper-z-index);
  }
}

.facets--vertical {
  display: none;

  @media screen and (min-width: 750px) {
    display: block;
    padding-block: 0 var(--padding-block-end);
  }
}

/* Form + filters row */
.facets__form-wrapper {
  display: flex;
  flex-direction: column;
  color: var(--filter-text-muted);
  width: 100%;
}

.facets__form {
  display: flex;
  flex-flow: column;
  gap: 12px;
  width: 100%;

  @media screen and (min-width: 750px) {
    flex-flow: row nowrap;
    align-items: center;
    gap: 16px;
  }
}

.facets__filters-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  @media screen and (min-width: 750px) {
    margin-inline-end: var(--margin-md);
    max-width: 60%;
    column-gap: 16px;
  }
}

.facets__overflow-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* Products count chip */
.products-count-wrapper {
  background: var(--filter-pill-bg);
  border-radius: 999px;
  border: 1px solid var(--filter-border);
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--filter-text-muted);
  white-space: nowrap;

  @media screen and (min-width: 750px) {
    margin-left: auto;
    position: static;
  }
}

/* Toggle buttons (Price, Rarity, Set, etc.) */
.facets__panel {
  position: relative;
}

.facets__summary {
  --icon-opacity: 0.55;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 9px 16px;
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid var(--filter-border);
  background: var(--filter-pill-bg);
  color: var(--filter-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.08s ease;

  @media screen and (min-width: 750px) {
    font-size: 13px;
    height: var(--minimum-touch-target);
  }
}

.facets__summary:hover {
  background: var(--filter-pill-bg-hover);
  border-color: var(--filter-accent);
  transform: translateY(-1px);
}

.facets__summary .icon-caret,
.facets__summary .svg-wrapper.icon-caret {
  height: var(--icon-size-xs);
  width: var(--icon-size-xs);
  color: rgb(var(--color-foreground-rgb) / var(--icon-opacity));
}

.facets__panel[open] > .facets__summary {
  background: var(--filter-accent);
  border-color: var(--filter-accent);
  color: #fff;
}

/* Make sort pill match */
.sorting-filter .facets__summary {
  background: var(--filter-pill-bg);
}

/* Inputs container inside panel */
.facets__inputs {
  display: flex;
  flex-direction: column;
  gap: var(--padding-md);
}

.facets__inputs-wrapper {
  margin-block: var(--padding-xs);
}

/* Checkbox list basics */
.facets__inputs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Label / row */
.facets__label,
.facets__inputs-list label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  cursor: pointer;
}

/* Base checkbox – desktop + mobile */
.facets__input[type='checkbox'] {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid rgba(255, 255, 255, 0.26);
  background: rgba(255, 255, 255, 0.03);
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;
}

.facets__input[type='checkbox']:hover {
  border-color: rgba(255, 255, 255, 0.36);
  background: rgba(255, 255, 255, 0.06);
}

.facets__input[type='checkbox']:checked {
  background: var(--filter-accent);
  border-color: var(--filter-accent);
}

.facets__input[type='checkbox']:checked::after {
  content: '✓';
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Grid density controls */
.grid-density-controls {
  display: flex;
  gap: 6px;
}

.grid-density-controls button {
  background: var(--filter-pill-bg);
  border: 1px solid var(--filter-border);
  border-radius: 8px;
  padding: 8px;
  color: var(--filter-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.grid-density-controls button:hover,
.grid-density-controls button[aria-selected='true'] {
  background: var(--filter-accent);
  border-color: var(--filter-accent);
  color: #fff;
}

/* ==========================================================================
   MOBILE – MODAL CARD EXPERIENCE
   ========================================================================== */

@media screen and (max-width: 749px) {
  .facets-block-wrapper {
    margin-inline: 12px;
    padding: 12px;
  }

  .facets--horizontal {
    gap: 12px;
  }

  .facets__form {
    gap: 10px;
  }

  /* Filters: two-column pill layout, aligned */
  .facets__filters-wrapper {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .facets__item {
    flex: 1 1 48%;
    min-width: 48%;
    box-sizing: border-box;
  }

  .facets__summary {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  /* Show all filters – no overflow "More" button */
  .facets__overflow-list {
    width: 100%;
  }
  .facets__overflow-list overflow-more-menu,
  .facets__overflow-list [data-overflow-more],
  .facets__overflow-list .overflow-list__more {
    display: none !important;
  }

  /* Hide Availability filter completely */
  .facets__item:has([data-filter-id*='availability']),
  .facets__panel[data-filter-name='availability'],
  .facets__item:first-child:has([id*='availability']) {
    display: none !important;
  }

  /* Hide active filter pills on mobile */
  .facets__active-filters,
  .facets__filter-pills,
  .active-facets,
  .facets__form .facets__active-filters-wrapper {
    display: none !important;
  }

  /* Keep "Clear all" in bar */
  .facets__clear-all {
    display: inline-block !important;
    margin-bottom: 6px;
    font-size: 13px;
  }

  /* Suppress the ::before backdrop pseudo on open panels
     (portal handles backdrop via inline-styled body-level div) */
  .facets__panel[open]::before {
    display: none !important;
  }

  /* Product count chip pinned bottom-right on mobile */
  .products-count-wrapper {
    position: fixed;
    bottom: 12px;
    right: 12px;
    margin-top: 0;
    font-size: 13px;
    z-index: 1100;
  }

  /* Native sort dropdown only – no custom modal */
  select[name='sort_by'] {
    appearance: auto !important;
    -webkit-appearance: menulist !important;
    -moz-appearance: menulist !important;
    width: 100%;
    padding: 10px 14px;
    font-size: 14px;
    border-radius: 10px;
    border: 1px solid var(--filter-border);
    background: var(--filter-pill-bg);
    color: var(--filter-text);
  }

  .facets__sort-modal,
  .sorting-modal,
  .sort-drawer,
  .sorting-drawer {
    display: none !important;
  }

  /* Hide actions bar in inline layout – only use See results inside drawer/modal */
  .facets:not(.facets--drawer) .facets__actions,
  .facets-block-wrapper:not(.facets-block-wrapper--drawer) .facets__actions {
    display: none !important;
  }

  /* ── Portal content styling ──
     Content moved to body loses theme styles; re-apply dark theme */
  .cc-portal-container .facets__panel-content {
    color: #fff !important;
  }
  .cc-portal-container .facets__inputs-wrapper {
    max-height: 55vh !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  .cc-portal-container .facets__inputs-list {
    list-style: none !important;
    padding: 0 !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
  }
  .cc-portal-container .facets__inputs-list li {
    padding: 0 !important;
  }
  .cc-portal-container .facets__label {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    padding: 10px 6px !important;
    font-size: 15px !important;
    color: #fff !important;
    cursor: pointer !important;
  }
  .cc-portal-container .facets__label-text {
    color: #fff !important;
    flex: 1 !important;
  }
  .cc-portal-container .facets__input[type='checkbox'] {
    -webkit-appearance: none !important;
    appearance: none !important;
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    border-radius: 6px !important;
    border: 1.5px solid rgba(255,255,255,0.26) !important;
    background: rgba(255,255,255,0.03) !important;
    position: relative !important;
    flex-shrink: 0 !important;
    cursor: pointer !important;
  }
  .cc-portal-container .facets__input[type='checkbox']:checked {
    background: #F97316 !important;
    border-color: #F97316 !important;
  }
  .cc-portal-container .facets__input[type='checkbox']:checked::after {
    content: '\2713' !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    color: #fff !important;
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .cc-portal-container .cc-facet-search {
    width: 100% !important;
    padding: 10px 14px !important;
    margin-bottom: 10px !important;
    border-radius: 10px !important;
    border: 1px solid rgba(255,255,255,0.16) !important;
    background: rgba(255,255,255,0.06) !important;
    color: #fff !important;
    font-size: 14px !important;
    box-sizing: border-box !important;
    outline: none !important;
  }
  .cc-portal-container .cc-facet-search::placeholder {
    color: rgba(255,255,255,0.4) !important;
  }
}

/* ==========================================================================
   DESKTOP – REFINEMENTS
   ========================================================================== */

@media screen and (min-width: 750px) {
  /* Hide availability on desktop too */
  .facets__item:has([data-filter-id*='availability']),
  .facets__panel[data-filter-name='availability'],
  .facets__item:first-child {
    display: none !important;
  }

  /* Rarity filter uses ordered column layout (for JS reordering) */
  .facets__panel[data-filter-name*='rarity'] .facets__inputs-wrapper,
  .facets__panel[data-filter-id*='rarity'] .facets__inputs-wrapper {
    display: flex !important;
    flex-direction: column !important;
  }

  /* Keep filters from dimming when Sort is open */
  .facets__filters-wrapper:hover .facets__summary,
  .facets__filters-wrapper:has(.facets__panel[open]) .facets__summary {
    opacity: 1 !important;
  }

  /* Sort popover: prevent stretching whole bar */
  .sorting-filter details[open].facets__panel {
    position: relative !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .sorting-filter .sorting-filter__options {
    position: absolute !important;
    top: 100% !important;
    right: 0 !important;
    width: max-content !important;
    max-height: 300px;
    z-index: 9999 !important;

    background: var(--color-background);
    border-radius: var(--style-border-radius-popover);
    border: var(--style-border-popover);
    box-shadow: var(--shadow-popover);

    display: flex !important;
    flex-direction: column;
    opacity: 1 !important;
    block-size: auto !important;
    overflow-y: auto !important;
  }
}
{% endstylesheet %}

<script>
/* ================================================================
   Mobile filter portal – moves panel content to body level
   ================================================================
   Shopify themes set transform/contain/backdrop-filter/container-type
   on ancestor wrappers, which breaks position:fixed. Instead we move
   the panel content to a body-level portal container on mobile.
*/
(function() {
  var backdrop = null;
  var container = null;
  var sourcePanel = null;
  var sourceContent = null;

  function isMobile() { return window.innerWidth < 750; }

  function ensurePortal() {
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.style.cssText =
      'display:none;position:fixed;inset:0;z-index:99998;' +
      'background:rgba(0,0,0,0.62);backdrop-filter:blur(6px) saturate(140%);';
    document.body.appendChild(backdrop);

    container = document.createElement('div');
    container.className = 'cc-portal-container';
    container.style.cssText =
      'display:none;position:fixed;left:50%;transform:translateX(-50%);' +
      'bottom:18px;width:calc(100vw - 26px);max-width:520px;max-height:72vh;' +
      'z-index:99999;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
      'background:radial-gradient(circle at top,#2e3244 0,#1f2230 55%,#181b25 100%);' +
      'border-radius:18px;border:1px solid rgba(255,255,255,0.12);' +
      'padding:16px 16px 10px;' +
      'box-shadow:0 18px 60px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.06) inset;';
    document.body.appendChild(container);

    backdrop.addEventListener('click', closePortal);
  }

  function openPortal(panel) {
    ensurePortal();
    var content = panel.querySelector('.facets__panel-content');
    if (!content) return;

    sourcePanel = panel;
    sourceContent = content;

    container.appendChild(content);

    // Force content visible (theme CSS hides it when not inside details[open])
    content.style.cssText = 'display:block!important;opacity:1!important;' +
      'visibility:visible!important;height:auto!important;' +
      'position:static!important;transform:none!important;' +
      'max-height:none!important;overflow:visible!important;';

    if (!content.querySelector('.cc-portal-close')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cc-portal-close';
      btn.style.cssText =
        'display:block;margin:14px auto 6px;padding:7px 16px;border-radius:999px;' +
        'font-size:13px;font-weight:500;color:rgba(255,255,255,0.8);' +
        'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.14);cursor:pointer;';
      btn.textContent = 'Close \u00d7';
      btn.addEventListener('click', closePortal);
      content.appendChild(btn);
    }

    backdrop.style.display = 'block';
    container.style.display = 'block';
  }

  function closePortal() {
    if (!sourcePanel || !sourceContent) return;
    sourceContent.style.cssText = '';
    sourcePanel.appendChild(sourceContent);
    if (backdrop) backdrop.style.display = 'none';
    if (container) container.style.display = 'none';
    sourcePanel.removeAttribute('open');
    sourcePanel = null;
    sourceContent = null;
  }

  function attachListeners() {
    document.querySelectorAll('.facets__panel').forEach(function(panel) {
      if (panel._ccPortalBound) return;
      panel._ccPortalBound = true;
      panel.addEventListener('toggle', function() {
        if (!isMobile()) return;
        if (this.open) {
          openPortal(this);
        } else if (sourcePanel === this) {
          closePortal();
        }
      });
    });
  }

  function closeOnMobile() {
    if (isMobile()) {
      closePortal();
      document.querySelectorAll('.facets__panel[open]').forEach(function(p) {
        p.removeAttribute('open');
      });
    }
  }

  function init() {
    closeOnMobile();
    attachListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  document.addEventListener('facets:updated', function() { setTimeout(init, 100); });

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      closeOnMobile();
      attachListeners();
    }, 250);
  });
})();
</script>

<script>
/* ================================================================
   Rarity ordering – common -> rarest (shared for all games)
   ================================================================ */
(function() {
  const rarityOrder = [
    'common','uncommon','rare','super rare','mythic rare','mythic',
    'ultra rare','majestic','secret rare','legendary','ultimate rare',
    'fabled','marvel','ghost rare','starlight rare'
  ];

  function sortRarities() {
    let rarityFilter = document.querySelector('[data-filter-id*="rarity"]');

    if (!rarityFilter) {
      document.querySelectorAll('.facets__panel').forEach(panel => {
        if (rarityFilter) return;
        const summary = panel.querySelector('.facets__summary');
        if (summary && summary.textContent.toLowerCase().includes('rarity')) {
          rarityFilter = panel;
        }
      });
    }
    if (!rarityFilter) return;

    const inputsWrapper = rarityFilter.querySelector('.facets__inputs-wrapper, .facets__inputs');
    if (!inputsWrapper) return;

    const items = Array.from(inputsWrapper.querySelectorAll('.facets__label, label'));
    if (!items.length) return;

    items.sort((a, b) => {
      const aText = a.textContent.trim().toLowerCase();
      const bText = b.textContent.trim().toLowerCase();
      let aIndex = rarityOrder.findIndex(r => aText.includes(r));
      let bIndex = rarityOrder.findIndex(r => bText.includes(r));
      if (aIndex === -1) aIndex = 999;
      if (bIndex === -1) bIndex = 999;
      return aIndex - bIndex;
    });

    items.forEach(item => inputsWrapper.appendChild(item));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sortRarities);
  } else {
    sortRarities();
    setTimeout(sortRarities, 500);
    setTimeout(sortRarities, 1500);
  }

  document.addEventListener('facets:updated', sortRarities);
})();
</script>

<script>
/* ================================================================
   Native sort select on mobile – keeps OS picker, no blur nonsense
   ================================================================ */
(function() {
  function enableNativeSort() {
    if (window.innerWidth >= 750) return;

    const sortSelect = document.querySelector('select[name="sort_by"]');
    if (!sortSelect) return;

    const newSelect = sortSelect.cloneNode(true);
    sortSelect.parentNode.replaceChild(newSelect, sortSelect);

    newSelect.onchange = function() {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', this.value);
      window.location.href = url.toString();
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enableNativeSort);
  } else {
    enableNativeSort();
  }

  /* As a safety net, periodically remove any rogue sort modals */
  setInterval(() => {
    document
      .querySelectorAll('.sort-drawer, .sort-modal, .sorting-modal')
      .forEach(el => el.remove());
  }, 800);
})();
</script>

<script>
/* ================================================================
   Auto-expand "Show more" inside filter panels on mobile
   (so Sets etc. are fully open by default)
   ================================================================ */
(function() {
  function isMobile() {
    return window.innerWidth < 750;
  }

  function expandShowMoreInPanel(panel) {
    if (!panel) return;
    if (!isMobile()) return;

    const buttons = panel.querySelectorAll('.facets__show-more[data-show-more], [data-show-more].show-more');

    buttons.forEach((btn) => {
      const expanded =
        btn.getAttribute('aria-expanded') === 'true' ||
        btn.dataset.expanded === 'true';
      if (!expanded) {
        btn.click();
        btn.dataset.expanded = 'true';
      }
    });
  }

  function expandShowMoreAllOpenPanels() {
    if (!isMobile()) return;
    document.querySelectorAll('.facets__panel[open]').forEach(expandShowMoreInPanel);
  }

  function init() {
    expandShowMoreAllOpenPanels();

    document.addEventListener('facets:updated', expandShowMoreAllOpenPanels);

    document.querySelectorAll('.facets__panel').forEach((panel) => {
      panel.addEventListener('toggle', function() {
        if (this.open) {
          expandShowMoreInPanel(this);
        }
      });
    });

    let resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(expandShowMoreAllOpenPanels, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>

<script>
/* ================================================================
   MOBILE FILTERS: "More Filters" Toggle + Label Shortening
   ================================================================ */
(function() {

  const primaryFilters = [
    'price',
    'rarity',
    'set',
    'colour',
    'color'
  ];

  const labelRenames = {
    'Converted Mana Cost': 'CMC',
    'converted mana cost': 'CMC',
    'Mana Value': 'CMC',
    'Color Identity': 'Colour',
    'color_identity': 'Colour'
  };

  function isMobile() {
    return window.innerWidth < 750;
  }

  function isPrimaryFilter(filterEl) {
    const text = filterEl.textContent.toLowerCase();
    const id = filterEl.getAttribute('data-filter-id') || '';
    const name = filterEl.getAttribute('data-filter-name') || '';

    return primaryFilters.some(f =>
      text.includes(f) || id.includes(f) || name.includes(f)
    );
  }

  function markSecondaryFilters() {
    if (!isMobile()) return;

    const filters = document.querySelectorAll('.facets__item, .facets__panel');

    filters.forEach(filter => {
      if (filter.querySelector('select[name="sort_by"]') ||
          filter.classList.contains('sorting-filter')) {
        return;
      }

      if (!isPrimaryFilter(filter)) {
        filter.setAttribute('data-filter-secondary', 'true');
        filter.classList.add('filter-secondary');
      } else {
        filter.removeAttribute('data-filter-secondary');
        filter.classList.remove('filter-secondary');
      }
    });
  }

  function injectMoreFiltersButton() {
    if (!isMobile()) return;

    const wrapper = document.querySelector('.facets__filters-wrapper, .facets__overflow-list');
    if (!wrapper) return;

    if (wrapper.querySelector('.more-filters-toggle')) return;

    const secondaryFilters = document.querySelectorAll('[data-filter-secondary="true"], .filter-secondary');
    if (secondaryFilters.length === 0) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'more-filters-toggle';
    btn.innerHTML = '<span class="toggle-icon">+</span><span class="toggle-text"></span>';

    const sortFilter = wrapper.querySelector('.sorting-filter, [class*="sort"]');
    if (sortFilter) {
      wrapper.insertBefore(btn, sortFilter);
    } else {
      wrapper.appendChild(btn);
    }
  }

  function handleToggle(e) {
    if (!e.target.closest('.more-filters-toggle')) return;

    const wrapper = document.querySelector('.facets-block-wrapper');
    if (wrapper) {
      wrapper.classList.toggle('filters-expanded');
    }
  }

  function shortenLabels() {
    if (!isMobile()) return;

    document.querySelectorAll('.facets__summary').forEach(summary => {
      const spans = summary.querySelectorAll('span');
      const textEl = spans[0] || summary;

      let text = textEl.textContent.trim();

      for (const [long, short] of Object.entries(labelRenames)) {
        if (text.toLowerCase().includes(long.toLowerCase())) {
          textEl.textContent = short;
          return;
        }
      }

      if (labelRenames[text]) {
        textEl.textContent = labelRenames[text];
      }
    });
  }

  function init() {
    markSecondaryFilters();
    injectMoreFiltersButton();
    shortenLabels();

    document.addEventListener('click', handleToggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('facets:updated', () => {
    setTimeout(init, 100);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 250);
  });

})();
</script>

<script>
  window.CrypticCabinFilters = {
    apiUrl: 'https://leagues.crypticcabin.com/api/bulk-data/filtered',
    pageSize: 24
  };
</script>
<script src="https://leagues.crypticcabin.com/js/collection-filters.js" defer></script>

{% schema %}
{
  "name": "t:names.filters",
  "tag": null,
  "settings": [
    {
      "type": "checkbox",
      "id": "enable_filtering",
      "label": "t:settings.enable_filtering",
      "info": "t:info.enable_filtering_info",
      "default": true
    },
    {
      "type": "select",
      "id": "filter_style",
      "label": "t:settings.direction",
      "options": [
        { "value": "horizontal", "label": "t:options.horizontal" },
        { "value": "vertical",   "label": "t:options.vertical" }
      ],
      "default": "horizontal",
      "visible_if": "{{ block.settings.enable_filtering == true }}"
    },
    {
      "type": "select",
      "id": "filter_width",
      "label": "t:settings.width",
      "options": [
        { "value": "centered",  "label": "t:options.page" },
        { "value": "full-width","label": "t:options.full" }
      ],
      "default": "centered",
      "visible_if": "{{ block.settings.enable_filtering == true and block.settings.filter_style == 'horizontal' }}"
    },
    {
      "type": "select",
      "id": "text_label_case",
      "label": "t:settings.text_label_case",
      "options": [
        { "value": "default",   "label": "t:options.default" },
        { "value": "uppercase", "label": "t:options.uppercase" }
      ],
      "default": "default",
      "visible_if": "{{ block.settings.enable_filtering == true }}"
    },
    {
      "type": "checkbox",
      "id": "show_swatch_label",
      "label": "t:settings.show_swatch_label",
      "default": false,
      "visible_if": "{{ block.settings.enable_filtering == true }}"
    },
    {
      "type": "checkbox",
      "id": "show_filter_label",
      "label": "t:settings.show_filter_label",
      "default": false,
      "visible_if": "{{ block.settings.enable_filtering == true }}"
    },
    {
      "type": "checkbox",
      "id": "enable_sorting",
      "label": "t:settings.enable_sorting",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "enable_grid_density",
      "label": "t:settings.enable_grid_density",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "inherit_color_scheme",
      "label": "t:settings.inherit_color_scheme",
      "default": true
    },
    {
      "type": "color_scheme",
      "id": "color_scheme",
      "label": "t:settings.color_scheme",
      "default": "scheme-1",
      "visible_if": "{{ block.settings.inherit_color_scheme == false }}"
    },
    {
      "type": "header",
      "content": "t:content.padding"
    },
    {
      "type": "range",
      "id": "padding-block-start",
      "label": "t:settings.top",
      "min": 0,
      "max": 100,
      "step": 1,
      "unit": "px",
      "default": 0
    },
    {
      "type": "range",
      "id": "padding-block-end",
      "label": "t:settings.bottom",
      "min": 0,
      "max": 100,
      "step": 1,
      "unit": "px",
      "default": 0
    },
    {
      "type": "range",
      "id": "padding-inline-start",
      "label": "t:settings.left",
      "min": 0,
      "max": 100,
      "step": 1,
      "unit": "px",
      "default": 0
    },
    {
      "type": "range",
      "id": "padding-inline-end",
      "label": "t:settings.right",
      "min": 0,
      "max": 100,
      "step": 1,
      "unit": "px",
      "default": 0
    },
    {
      "type": "header",
      "content": "t:content.margin"
    },
    {
      "type": "range",
      "id": "facets_margin_bottom",
      "label": "t:settings.bottom",
      "min": 0,
      "max": 100,
      "step": 1,
      "unit": "px",
      "default": 8,
      "visible_if": "{{ block.settings.filter_style == 'horizontal' }}"
    },
    {
      "type": "range",
      "id": "facets_margin_right",
      "label": "t:settings.right",
      "min": 0,
      "max": 100,
      "step": 1,
      "unit": "px",
      "default": 20,
      "visible_if": "{{ block.settings.filter_style == 'vertical' }}"
    }
  ]
}
{% endschema %}
```
