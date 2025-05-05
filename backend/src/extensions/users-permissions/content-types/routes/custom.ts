export default {
    routes: [
      {
        method: 'PUT',
        path: '/user/profile',
        handler: 'user.updateProfile',
        config: {
          auth: {
            scope: ['authenticated'],
          },
        },
      },
    ],
  };
  