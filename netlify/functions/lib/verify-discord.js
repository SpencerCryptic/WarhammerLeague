const crypto = require('crypto');

// Ed25519 SPKI header (DER-encoded prefix for Ed25519 public keys)
const ED25519_SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Verify a Discord interaction request signature using Ed25519.
 * Uses Node built-in crypto — no external dependencies.
 */
function verifyDiscordSignature(publicKeyHex, timestamp, rawBody, signature) {
  try {
    const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
    const spkiKey = Buffer.concat([ED25519_SPKI_HEADER, publicKeyBytes]);

    const key = crypto.createPublicKey({
      key: spkiKey,
      format: 'der',
      type: 'spki'
    });

    const message = Buffer.from(timestamp + rawBody);
    const sig = Buffer.from(signature, 'hex');

    return crypto.verify(null, message, key, sig);
  } catch (err) {
    console.error('Signature verification error:', err.message);
    return false;
  }
}

module.exports = { verifyDiscordSignature };
