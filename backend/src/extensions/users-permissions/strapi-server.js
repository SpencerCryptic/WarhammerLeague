const authController = require('./controllers/auth');

module.exports = (plugin) => {
  // Override the auth controller with custom forgot password functionality
  plugin = authController(plugin);
  return plugin;
};
