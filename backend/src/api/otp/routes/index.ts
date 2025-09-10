export default {
  routes: [
    {
      method: 'POST',
      path: '/otps/generate',
      handler: 'otp.generateOTPs',
      config: {
        auth: {
          required: true,
        },
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/otps/league/:leagueId',
      handler: 'otp.getLeagueOTPs',
      config: {
        auth: {
          required: true,
        },
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/otps/verify',
      handler: 'otp.verifyOTP',
      config: {
        auth: {
          required: true,
        },
        policies: [],
      },
    },
  ],
};