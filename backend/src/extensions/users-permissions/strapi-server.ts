import authController from './controllers/auth';

export default (plugin) => {
  // Override the auth controller with custom forgot password functionality
  plugin = authController(plugin);
  return plugin;
};
