# Cryptic Cabin Bulk Data

Scryfall-compatible MTG inventory API for [tcg.crypticcabin.com](https://tcg.crypticcabin.com).

## Endpoints

```
GET  /bulk-data/cryptic-cabin-inventory.json  - Full inventory
GET  /api/bulk-data                           - Filtered API
GET  /api/bulk-data?set=mh3&in_stock=true     - Filter by set + stock
GET  /api/bulk-data?q=lightning               - Search by name
POST /api/bulk-data/collection                - Batch lookup
```

## Setup

### 1. Deploy to Netlify

Connect this repo to Netlify. The build command runs automatically.

### 2. Configure Environment Variables

Go to **Site settings → Environment variables** and add:

#### Required:
- `NETLIFY_BUILD_HOOK` - Build hook URL for daily refresh (see step 3)

#### Recommended:
- `SHOPIFY_ACCESS_TOKEN` - Admin API token for accurate inventory quantities
  - Without this, inventory will show as unavailable
  - Create at: Shopify Admin → Apps → Develop apps → Create custom app
  - Required scopes: `read_products`, `read_inventory`

#### Optional:
- `SLACK_WEBHOOK_URL` - For build failure notifications

### 3. Configure Daily Refresh

1. Go to **Site settings → Build & deploy → Build hooks**
2. Create a new hook named "Daily Refresh"
3. Copy the URL and add as `NETLIFY_BUILD_HOOK` environment variable

The scheduled function will trigger a rebuild daily at 6 AM UTC.

## Local Development

```bash
npm install
npm run dev
# Opens http://localhost:3001/bulk-data/
```

## API Usage

### Search inventory
```javascript
const response = await fetch(
  'https://YOUR-SITE.netlify.app/api/bulk-data?q=lightning+bolt&in_stock=true'
);
const { data, total_cards } = await response.json();
```

### Check deck availability
```javascript
const response = await fetch('https://YOUR-SITE.netlify.app/api/bulk-data/collection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifiers: [
      { scryfall_id: 'abc-123' },
      { name: 'Sol Ring' },
      { name: 'Lightning Bolt', set: 'sta' }
    ]
  })
});

const { data, not_found, summary } = await response.json();
console.log(`${summary.in_stock} of ${summary.found} cards in stock`);
console.log(`Total: £${summary.total_price_gbp}`);
```

## Query Parameters

| Param | Description | Example |
|-------|-------------|---------|
| `q` | Search name/text | `?q=bolt` |
| `set` | Filter by set code | `?set=mh3` |
| `in_stock` | Only in-stock | `?in_stock=true` |
| `condition` | NM, LP, MP, HP, DMG | `?condition=NM` |
| `finish` | nonfoil, foil, etched | `?finish=foil` |
| `rarity` | common, uncommon, rare, mythic | `?rarity=mythic` |
| `min_price` | Min price GBP | `?min_price=5` |
| `max_price` | Max price GBP | `?max_price=20` |
| `colors` | Color identity | `?colors=WU` |
| `page` | Page number | `?page=2` |
| `page_size` | Results per page (max 1000) | `?page_size=50` |

## Data Format

Each card follows Scryfall's schema with added `cryptic_cabin` field:

```json
{
  "id": "cc-123-456",
  "scryfall_id": "abc-def",
  "name": "Lightning Bolt",
  "set": "sta",
  "collector_number": "62",
  "mana_cost": "{R}",
  "type_line": "Instant",
  "oracle_text": "...",
  "legalities": { "modern": "legal", ... },
  "image_uris": { "normal": "...", ... },
  "cryptic_cabin": {
    "url": "https://tcg.crypticcabin.com/products/...",
    "price_gbp": 3.50,
    "quantity": 4,
    "in_stock": true,
    "condition": "NM",
    "finish": "nonfoil"
  }
}
```

## Integration with Moxfield Decks

```javascript
// Parse a Moxfield deck and check CC stock
async function checkDeckStock(moxfieldDeckId) {
  // Get deck from Moxfield (unofficial)
  const deck = await fetch(`https://api2.moxfield.com/v2/decks/all/${moxfieldDeckId}`)
    .then(r => r.json());

  // Build identifiers from mainboard
  const identifiers = Object.values(deck.mainboard).map(entry => ({
    scryfall_id: entry.card.scryfall_id
  }));

  // Check Cryptic Cabin
  const stock = await fetch('https://YOUR-SITE.netlify.app/api/bulk-data/collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers })
  }).then(r => r.json());

  return stock;
}
```
