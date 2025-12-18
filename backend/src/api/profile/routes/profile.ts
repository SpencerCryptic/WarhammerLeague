export default {
  routes: [
    {
      method: 'PUT',
      path: '/profile/update',
      handler: 'profile.update',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'PUT',
      path: '/profile/update-limited',
      handler: 'profile.updateLimited',
      config: {
        auth: {
          required: true,
        },
      },
    },
  ],
};