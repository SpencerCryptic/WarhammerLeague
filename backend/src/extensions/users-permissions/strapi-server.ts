import authController from './controllers/auth';
import userController from './controllers/user';

export default (plugin) => {
  // Override the auth controller with custom forgot password functionality
  plugin = authController(plugin);

  // Add custom user controller methods
  plugin.controllers.user.myProfile = userController.me;
  plugin.controllers.user.updateProfile = userController.updateProfile;
  plugin.controllers.user.count = userController.count;

  // Add custom routes for user profile - using correct Strapi format
  plugin.routes['content-api'].routes.push(
    {
      method: 'GET',
      path: '/user/me',
      handler: 'user.myProfile',
      config: {
        prefix: '',
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/user/profile',
      handler: 'user.updateProfile',
      config: {
        prefix: '',
        policies: [],
      },
    }
  );

  return plugin;
};
