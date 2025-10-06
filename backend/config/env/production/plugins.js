module.exports = ({ env }) => ({
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
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
      },
      settings: {
        defaultFrom: 'noreply@crypticcabin.com',
        defaultReplyTo: 'noreply@crypticcabin.com',
      },
    },
  },
});