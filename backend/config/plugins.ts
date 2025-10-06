export default ({ env }) => ({
  'users-permissions': {
    enabled: true,
    config: {
      jwt: {
        expiresIn: '7d',
      },
      resetPasswordUrl: 'https://leagues.crypticcabin.com/auth/reset-password',
      confirmationUrl: 'https://leagues.crypticcabin.com/auth/email-confirmation',
    },
  },
  email: {
    config: {
      provider: 'strapi-provider-email-strapi-cloud',
      providerOptions: {
        // Strapi Cloud email provider options
      },
      settings: {
        defaultFrom: env('SMTP_FROM', 'noreply@crypticcabin.com'),
        defaultReplyTo: env('SMTP_REPLY_TO', 'noreply@crypticcabin.com'),
      },
    },
  },
});
