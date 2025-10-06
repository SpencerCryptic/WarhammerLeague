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
        defaultFrom: 'noreply@crypticcabin.com',
        defaultReplyTo: 'noreply@crypticcabin.com',
      },
    },
  },
});
