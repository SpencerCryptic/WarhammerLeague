export default {
  routes: [
    {
      method: 'GET',
      path: '/user/me',
      handler: 'user.me',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'POST',
      path: '/user/update-profile',
      handler: 'user.updateProfile',
      config: {
        auth: {
          required: true,
        },
      },
    },
  ],
};