import authController from './controllers/auth';
import userController from './controllers/user';
import customRoutes from './content-types/user/routes/custom';

export default (plugin) => {
  // Override the auth controller with custom forgot password functionality
  plugin = authController(plugin);

  // Add custom user controller methods
  plugin.controllers.user.me = userController.me;
  plugin.controllers.user.updateProfile = userController.updateProfile;
  plugin.controllers.user.count = userController.count;

  // Add custom routes for user profile
  plugin.routes['content-api'].routes.push(...customRoutes.routes);

  return plugin;
};
