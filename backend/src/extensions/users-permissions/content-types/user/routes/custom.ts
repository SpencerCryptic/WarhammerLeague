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

//this can be used to update a user profile, but not specifically their own profile - which is dangerous
//so we need to create a custom route to update the logged in user's profile only