'use strict';

module.exports = (plugin) => {
  const userRoutes = require('./content-types/user/routes/custom').default;
  const userController = require('./controllers/user').default;
  const authController = require('./controllers/auth').default;
  
  // Override the default user controller with our custom one
  plugin.controllers.user = userController;
  
  // Override the auth controller to add profanity filtering
  authController(plugin);
  
  // Register custom user routes
  plugin.routes['content-api'].routes.push(...userRoutes.routes);
  
  return plugin;
};
