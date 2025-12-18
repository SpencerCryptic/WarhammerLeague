const emails = [
  'noreply@crypticcabin.com',
  'service@paypal.co.uk',
  'notify-noreply@google.com',
  'sales@nextdaycatering.co.uk',
  'neil.jagger@battlefront.co.nz',
  'no-reply@accounts.google.com',
  'support@stripe.com',
  'shopify-capital-offers@email.shopify.com',
  'shopper@worldpay.com',
  'george@blissdistribution.co.uk',
  'accounts@asmodee.co.uk',
  'info@londoncardshow.co.uk',
  'noreply@youtube.com',
  'store+95349997945@t.shopifyemail.com',
  'no-reply@goaffpro.com',
  'hello@info.tide.co',
  'store+88385716565@m.shopifyemail.com',
  'rob.d@steamforged.com',
  'help@japan2uk.com',
  'siegestudiosuk@39695361.mailchimpapp.com',
  'donotreply.sales@asmodee.co.uk',
  'news@typeform.com',
  'updates@allevents.in'
];

const STRAPI_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

async function addToBlocklist(email, token) {
  const response = await fetch(`${STRAPI_URL}/api/email-blocklists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        email: email,
        reason: 'Auto-added: system/marketing email'
      }
    })
  });

  if (response.ok) {
    console.log(`Added: ${email}`);
  } else {
    const err = await response.json();
    console.log(`Skip ${email}: ${err.error && err.error.message ? err.error.message : 'already exists'}`);
  }
}

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.log('Usage: node populate-blocklist.js <YOUR_JWT_TOKEN>');
    console.log('Get token from localStorage after logging in to the app');
    process.exit(1);
  }

  for (const email of emails) {
    await addToBlocklist(email, token);
  }
  console.log('Done!');
}

main();
