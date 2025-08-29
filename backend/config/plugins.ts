export default ({ env }) => ({
  'users-permissions': {
    enabled: true,
    config: {
      jwt: {
        expiresIn: '7d',
      },
    },
  },
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env.int('SMTP_PORT', 587),
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
        // For development, you can use services like Gmail, Outlook, etc.
        // service: env('SMTP_SERVICE', 'gmail'), // Uncomment to use Gmail
      },
      settings: {
        defaultFrom: env('SMTP_FROM', 'noreply@warhammerleague.com'),
        defaultReplyTo: env('SMTP_REPLY_TO', 'noreply@warhammerleague.com'),
      },
    },
  },
});
