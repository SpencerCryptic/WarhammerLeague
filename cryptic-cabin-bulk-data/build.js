#!/usr/bin/env node

/**
 * Build script - generates bulk data during Netlify build
 */

const { generateBulkData } = require('./scripts/generate-bulk-data');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

async function build() {
  console.log('🔨 Cryptic Cabin Bulk Data Build\n');

  // Output to BOTH locations:
  // 1. Repo root public/ for Netlify functions to read
  // 2. Frontend public/ for Next.js to serve as static files
  const rootPublicDir = path.join(__dirname, '../public/bulk-data');
  const frontendPublicDir = path.join(__dirname, '../frontend/public/bulk-data');

  fs.mkdirSync(rootPublicDir, { recursive: true });
  fs.mkdirSync(frontendPublicDir, { recursive: true });

  try {
    const bulkData = await generateBulkData();
    const json = JSON.stringify(bulkData);

    // Write files to BOTH locations
    fs.writeFileSync(path.join(rootPublicDir, 'cryptic-cabin-inventory.json'), json);
    fs.writeFileSync(path.join(rootPublicDir, 'cryptic-cabin-inventory.json.gz'), zlib.gzipSync(json));
    fs.writeFileSync(path.join(frontendPublicDir, 'cryptic-cabin-inventory.json'), json);
    fs.writeFileSync(path.join(frontendPublicDir, 'cryptic-cabin-inventory.json.gz'), zlib.gzipSync(json));

    const bulkDataDir = rootPublicDir; // Use root for metadata/HTML

    // Metadata
    const metadata = {
      object: 'bulk_data',
      id: 'cryptic-cabin-inventory',
      type: 'store_inventory',
      name: 'Cryptic Cabin MTG Inventory',
      description: 'Magic: The Gathering singles from Cryptic Cabin UK',
      download_uri: '/bulk-data/cryptic-cabin-inventory.json',
      content_type: 'application/json',
      updated_at: bulkData.generated_at,
      size: Buffer.byteLength(json),
      total_cards: bulkData.total_cards,
      statistics: bulkData.statistics
    };
    fs.writeFileSync(path.join(bulkDataDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Index page
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cryptic Cabin Bulk Data API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; line-height: 1.6; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; }
    a { color: #0066cc; }
    .stats { display: flex; gap: 2rem; flex-wrap: wrap; margin: 1rem 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #333; }
    .stat-label { color: #666; font-size: 0.9rem; }
    h2 { margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>🎴 Cryptic Cabin Bulk Data API</h1>
  <p>Scryfall-compatible MTG inventory from <a href="https://tcg.crypticcabin.com">Cryptic Cabin TCG</a>.</p>
  
  <div class="stats">
    <div class="stat"><div class="stat-value">${bulkData.total_cards.toLocaleString()}</div><div class="stat-label">Total Listings</div></div>
    <div class="stat"><div class="stat-value">${bulkData.statistics.in_stock.toLocaleString()}</div><div class="stat-label">In Stock</div></div>
    <div class="stat"><div class="stat-value">${bulkData.statistics.match_rate}</div><div class="stat-label">Scryfall Match</div></div>
  </div>

  <h2>Download</h2>
  <ul>
    <li><a href="/bulk-data/cryptic-cabin-inventory.json">Full inventory JSON</a> (${(metadata.size / 1024 / 1024).toFixed(1)} MB)</li>
    <li><a href="/bulk-data/cryptic-cabin-inventory.json.gz">Gzipped version</a></li>
    <li><a href="/bulk-data/metadata.json">Metadata</a></li>
  </ul>

  <h2>API Endpoints</h2>
  <ul>
    <li><code>GET /api/bulk-data</code> - All cards (paginated)</li>
    <li><code>GET /api/bulk-data?in_stock=true</code> - In-stock only</li>
    <li><code>GET /api/bulk-data?q=lightning+bolt</code> - Search</li>
    <li><code>GET /api/bulk-data?set=mh3</code> - Filter by set</li>
    <li><code>POST /api/bulk-data/collection</code> - Batch lookup</li>
  </ul>

  <h2>Example</h2>
  <pre>
// Check Cryptic Cabin stock for a deck
const response = await fetch('https://leagues.crypticcabin.com/api/bulk-data/collection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifiers: [
      { scryfall_id: 'card-uuid-here' },
      { name: 'Lightning Bolt', set: 'sta' }
    ]
  })
});
const { data, not_found } = await response.json();
  </pre>

  <p><small>Updated: ${new Date(bulkData.generated_at).toLocaleString()} • <a href="https://tcg.crypticcabin.com">Shop Now</a></small></p>
</body>
</html>`;
    fs.writeFileSync(path.join(bulkDataDir, 'index.html'), html);

    // Root redirect
    fs.writeFileSync(path.join(rootPublicDir, '..', 'index.html'),
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/bulk-data/"></head></html>`);

    console.log('\n✅ Build complete!');
    console.log(`   ${bulkData.total_cards.toLocaleString()} cards indexed`);

  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

build();
