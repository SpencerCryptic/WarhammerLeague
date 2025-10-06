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
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.gmail.com'),
        port: env('SMTP_PORT', 587),
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_FROM', 'noreply@crypticcabin.com'),
        defaultReplyTo: env('SMTP_REPLY_TO', 'noreply@crypticcabin.com'),
      },
    },
  },
});
