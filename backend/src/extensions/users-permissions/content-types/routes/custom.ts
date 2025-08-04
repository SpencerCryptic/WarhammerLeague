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
      method: 'PUT',
      path: '/user/profile',
      handler: 'user.updateProfile',
      config: {
        auth: {
          required: true,
        },
      },
    },
  ],
};