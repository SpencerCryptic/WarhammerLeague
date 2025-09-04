'use strict';

module.exports = (plugin) => {
  const userRoutes = require('./content-types/user/routes/custom').default;
  const userController = require('./controllers/user').default;
  
  // Override the default user controller with our custom one
  plugin.controllers.user = userController;
  
  // Register custom user routes
  plugin.routes['content-api'].routes.push(...userRoutes.routes);
  
  return plugin;
};
